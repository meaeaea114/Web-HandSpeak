'use client';

import { type Landmark } from './hand-landmarker';

export interface PostureMetrics {
  rotate: number; // 0 - 100%
  tilt: number; // 0 - 100%
  distance: number; // 0 - 100%
  switchHands: number; // 0 - 100%
  isOptimal: boolean;
  guidanceMessage: string;
}

// 21 points * 3 coordinates (x, y, z) * 2 hands max = 126 features
export const FEATURE_VECTOR_LENGTH = 126;
const OPTIMAL_THRESHOLD = 75;

function distance3d(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function scoreFromAngleDeviation(deviationDeg: number, toleranceDeg: number): number {
  const ratio = Math.abs(deviationDeg) / toleranceDeg;
  return clamp(Math.round((1 - ratio) * 100));
}

/**
 * Converts detected hand landmarks into a flattened 126-length feature vector.
 * Hand 1 occupies indices 0-62, Hand 2 occupies indices 63-125 (zero-padded if missing).
 */
export function landmarksToFeatureVector(landmarksPerHand: Landmark[][]): number[] {
  const vector = new Array(FEATURE_VECTOR_LENGTH).fill(0);

  landmarksPerHand.slice(0, 2).forEach((handLandmarks, handIdx) => {
    const offset = handIdx * 63;
    handLandmarks.slice(0, 21).forEach((point, pIdx) => {
      vector[offset + pIdx * 3] = point.x;
      vector[offset + pIdx * 3 + 1] = point.y;
      vector[offset + pIdx * 3 + 2] = point.z;
    });
  });

  return vector;
}

/**
 * Evaluates hand posture metrics (rotate, tilt, distance, hand consistency)
 * from live MediaPipe detected hand landmarks.
 */
export function computePostureMetrics(
  landmarksPerHand: Landmark[][],
  expectedHands = 1,
  targetSymbol = 'A'
): PostureMetrics {
  if (!landmarksPerHand || landmarksPerHand.length === 0) {
    return {
      rotate: 0,
      tilt: 0,
      distance: 0,
      switchHands: 0,
      isOptimal: false,
      guidanceMessage: 'No hand detected — position your hand inside the camera circle',
    };
  }

  const primaryHand = landmarksPerHand[0];
  if (!primaryHand || primaryHand.length < 21) {
    return {
      rotate: 0,
      tilt: 0,
      distance: 0,
      switchHands: 0,
      isOptimal: false,
      guidanceMessage: 'Incomplete hand detected — keep hand fully in view',
    };
  }

  const wrist = primaryHand[0];
  const indexMcp = primaryHand[5];
  const middleMcp = primaryHand[9];
  const pinkyMcp = primaryHand[17];
  const middleTip = primaryHand[12];

  // 1. ROTATE: Normal alignment of palm plane to camera
  const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y, z: indexMcp.z - wrist.z };
  const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y, z: pinkyMcp.z - wrist.z };
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
  const normalMagnitude = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2) || 1;
  const facingRatio = Math.abs(normal.z) / normalMagnitude;
  const rotate = scoreFromAngleDeviation((1 - facingRatio) * 90, 45);

  // 2. TILT: Wrist to middle fingertip alignment
  const wristToMiddle = { x: middleTip.x - wrist.x, y: middleTip.y - wrist.y };
  const wristToMiddleLength = Math.sqrt(wristToMiddle.x ** 2 + wristToMiddle.y ** 2) || 1;
  const tiltDeviationDeg = (Math.abs(wristToMiddle.x) / wristToMiddleLength) * 90;
  const tilt = scoreFromAngleDeviation(tiltDeviationDeg, 40);

  // 3. DISTANCE: Size / span of hand relative to frame
  const handSpan = distance3d(wrist, middleMcp);
  const IDEAL_SPAN_MIN = 0.12;
  const IDEAL_SPAN_MAX = 0.38;
  let distanceScore: number;
  if (handSpan < IDEAL_SPAN_MIN) {
    distanceScore = clamp(Math.round((handSpan / IDEAL_SPAN_MIN) * 100));
  } else if (handSpan > IDEAL_SPAN_MAX) {
    const overshoot = (handSpan - IDEAL_SPAN_MAX) / IDEAL_SPAN_MAX;
    distanceScore = clamp(Math.round((1 - overshoot) * 100));
  } else {
    distanceScore = 100;
  }

  // 4. SWITCH HANDS: Evaluates correct hand count matching target expectations
  const handCountScore = landmarksPerHand.length === expectedHands ? 100 : 60;

  const isOptimal =
    rotate >= OPTIMAL_THRESHOLD &&
    tilt >= OPTIMAL_THRESHOLD &&
    distanceScore >= OPTIMAL_THRESHOLD &&
    handCountScore >= OPTIMAL_THRESHOLD;

  let guidanceMessage = 'Great posture — hold steady';
  if (!isOptimal) {
    if (distanceScore < OPTIMAL_THRESHOLD) {
      guidanceMessage = handSpan < IDEAL_SPAN_MIN ? 'Move hand closer to camera' : 'Move hand slightly back';
    } else if (tilt < OPTIMAL_THRESHOLD) {
      guidanceMessage = 'Hold your hand more upright';
    } else if (rotate < OPTIMAL_THRESHOLD) {
      guidanceMessage = 'Rotate your palm to face the camera';
    } else if (landmarksPerHand.length < expectedHands) {
      guidanceMessage = `Please show both hands for this ${targetSymbol} gesture`;
    }
  }

  return {
    rotate,
    tilt,
    distance: distanceScore,
    switchHands: handCountScore,
    isOptimal,
    guidanceMessage,
  };
}