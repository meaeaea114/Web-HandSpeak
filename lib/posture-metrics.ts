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
 * Flattens one frame's landmarks (up to 2 hands x 21 points x 3 coords = 126
 * features) into a fixed-length feature vector for sequence models. Missing
 * hands are zero-padded so every frame has identical shape.
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

  return vector; // length 126, always
}

export const FEATURE_VECTOR_LENGTH = 126;