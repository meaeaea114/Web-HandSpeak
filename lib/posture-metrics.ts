import type { Landmark } from './hand-landmarker';

export interface HandOrientation {
  rollDeg: number; // in-plane rotation (knuckle line vs horizontal)
  pitchDeg: number; // up/down tilt
  yawDeg: number; // left/right turn — this is what distinguishes front vs side views
}

export interface FramingQuality {
  distance: number; // 0-100, how well-sized the hand is in frame
  switchHands: number; // 0-100, are the expected number of hands visible
}

// MediaPipe hand landmark indices (21 points per hand)
const WRIST = 0;
const INDEX_MCP = 5;
const PINKY_MCP = 17;
const MIDDLE_MCP = 9;

export const FEATURE_VECTOR_LENGTH = 126;

/**
 * Computes real, signed orientation angles from one hand's 21 landmarks.
 *
 * NOTE: MediaPipe's z coordinate is a *relative* depth estimate, not a
 * calibrated metric distance, so these angles are heuristic proxies rather
 * than exact degrees — but they respond monotonically and consistently to
 * real rotation, which is exactly what's needed to guide "turn to show your
 * left/right side" style capture steps.
 */
export function computeHandOrientation(hand: Landmark[]): HandOrientation {
  const wrist = hand[WRIST];
  const indexMcp = hand[INDEX_MCP];
  const pinkyMcp = hand[PINKY_MCP];
  const middleMcp = hand[MIDDLE_MCP];

  // ROLL: rotation of the knuckle line within the image plane.
  const dx = pinkyMcp.x - indexMcp.x;
  const dy = pinkyMcp.y - indexMcp.y;
  const rollDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  // YAW: left/right turn. If the hand is flat to the camera, the index and
  // pinky knuckles sit at roughly the same depth. Turning the hand to show
  // a side view pushes one knuckle closer to the camera than the other.
  const xSpread = Math.max(Math.abs(dx), 0.02);
  const yawDeg = Math.atan2(pinkyMcp.z - indexMcp.z, xSpread) * (180 / Math.PI);

  // PITCH: up/down tilt, same idea along the wrist -> middle-knuckle axis.
  const ySpread = Math.max(Math.abs(middleMcp.y - wrist.y), 0.02);
  const pitchDeg = Math.atan2(middleMcp.z - wrist.z, ySpread) * (180 / Math.PI);

  return { rollDeg, pitchDeg, yawDeg };
}

/**
 * Framing quality is independent of *which* view you're capturing — you want
 * good distance/centering for the front view, the side view, all of them.
 */
export function computeFramingQuality(landmarksPerHand: Landmark[][], expectedHands: number): FramingQuality {
  if (landmarksPerHand.length === 0) return { distance: 0, switchHands: 0 };

  const primary = landmarksPerHand[0];
  const xs = primary.map((p) => p.x);
  const ys = primary.map((p) => p.y);
  const bboxWidth = Math.max(...xs) - Math.min(...xs);
  const bboxHeight = Math.max(...ys) - Math.min(...ys);
  const bboxArea = bboxWidth * bboxHeight;
  const idealArea = 0.12; // empirical target for a well-framed hand

  const distance = clampScore(100 - Math.abs(bboxArea - idealArea) * 650);
  const switchHands =
    landmarksPerHand.length >= expectedHands ? 100 : Math.round((landmarksPerHand.length / expectedHands) * 100);

  return { distance: Math.round(distance), switchHands: Math.round(switchHands) };
}

function clampScore(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/**
 * Re-centers and rescales a raw 126-length feature vector so it is invariant
 * to where in the frame the primary hand is, and how close to the camera it
 * is: every point (across BOTH hand slots) is shifted so the primary hand's
 * wrist (landmark 0 of hand slot 0) sits at the origin, then divided by the
 * primary hand's own size (wrist -> middle-finger-MCP distance, landmark 9).
 *
 * Without this, two identical signs performed at different distances from
 * the camera, or in different parts of the frame, would produce different
 * stored feature vectors and would be scored as different by DTW and by any
 * trained LSTM. This is the SAME transform that was previously implemented
 * only inside gesture-template-match.ts for live DTW comparison (see that
 * file's normalizeSequence) — it is now applied once, here, at the point
 * every feature vector is created, so every downstream consumer (Firestore
 * storage, dataset export, LSTM training, LSTM inference, DTW) works from an
 * identical representation. The transform is idempotent (re-applying it to
 * an already-normalized vector is a no-op), so it is always safe to apply
 * again defensively — e.g. in the offline dataset exporter — without risk of
 * double-transforming real data.
 *
 * Deliberately normalizes relative to the PRIMARY hand only (not each hand
 * independently): for two-handed signs, the position of hand 2 relative to
 * hand 1 can be part of what the sign means, so hand 2's coordinates are
 * shifted/scaled using hand 1's wrist/scale rather than their own.
 */
export function normalizeFeatureVector(vector: number[]): number[] {
  if (vector.length !== FEATURE_VECTOR_LENGTH) {
    throw new Error(`Expected a ${FEATURE_VECTOR_LENGTH}-length feature vector, got ${vector.length}`);
  }

  const wristX = vector[WRIST * 3];
  const wristY = vector[WRIST * 3 + 1];
  const wristZ = vector[WRIST * 3 + 2];

  // Scale reference: distance from wrist to middle-finger MCP of the primary
  // hand. If no hand was detected at all (vector is all zeros), this is 0
  // and we fall back to 1 so we divide by 1, not 0 — the vector stays zero.
  const midX = vector[MIDDLE_MCP * 3];
  const midY = vector[MIDDLE_MCP * 3 + 1];
  const scale = Math.hypot(midX - wristX, midY - wristY) || 1;

  const normalized = new Array(vector.length);
  for (let i = 0; i < vector.length; i += 3) {
    normalized[i] = (vector[i] - wristX) / scale;
    normalized[i + 1] = (vector[i + 1] - wristY) / scale;
    normalized[i + 2] = (vector[i + 2] - wristZ) / scale;
  }
  return normalized;
}

/**
 * Flattens one frame's landmarks (up to 2 hands x 21 points x 3 coords = 126
 * features) into a fixed-length, NORMALIZED feature vector for sequence
 * models. Missing hands are zero-padded so every frame has identical shape.
 * Normalization (see normalizeFeatureVector above) is applied before this
 * function returns, so every caller — training capture, DTW, and (once
 * trained) the LSTM — already receives translation/scale-invariant features
 * with no extra step required.
 */
export function landmarksToFeatureVector(landmarksPerHand: Landmark[][]): number[] {
  const FEATURES_PER_HAND = 21 * 3;
  const vector: number[] = [];

  for (let h = 0; h < 2; h++) {
    const hand = landmarksPerHand[h];
    if (hand) {
      for (const point of hand) {
        vector.push(point.x, point.y, point.z);
      }
    } else {
      vector.push(...new Array(FEATURES_PER_HAND).fill(0));
    }
  }

  return normalizeFeatureVector(vector); // length 126, always
}