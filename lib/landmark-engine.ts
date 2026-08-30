/**
 * landmark-engine.ts
 *
 * Lightweight, dependency-free geometry helpers for turning hand landmark
 * points (the same 21-point shape MediaPipe Hands produces) into the
 * posture-quality metrics the Content Management UI displays:
 * rotate, tilt, distance, and switchHands, plus a guidance message.
 *
 * IMPORTANT: This module does NOT fabricate data. If no landmarks are
 * supplied (e.g. real hand tracking hasn't been wired into the video feed
 * yet), evaluateHandPosture reports an honest "no hand detected" result
 * with every metric at 0% rather than simulating progress.
 *
 * To get live, moving percentages in the UI, the caller needs to run an
 * actual hand-landmark detector (e.g. MediaPipe Tasks Vision's
 * HandLandmarker) against the <video> frame and pass the resulting
 * 21-point array (and optionally handedness) into evaluateHandPosture
 * instead of `null`.
 */

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type Handedness = 'Left' | 'Right' | 'Unknown';

export interface PostureEvaluation {
  /** 0-100: how well the palm is rotated/facing the camera */
  rotate: number;
  /** 0-100: how upright/vertical the hand is */
  tilt: number;
  /** 0-100: how well-framed the hand's distance from the camera is */
  distance: number;
  /** 0-100: how consistent the detected hand has been across recent samples */
  switchHands: number;
  /** Short, human-readable coaching tip for the weakest metric */
  guidanceMessage: string;
  /** True once every metric clears the "optimal" threshold */
  isOptimal: boolean;
}

const LANDMARK_COUNT = 21;
const OPTIMAL_THRESHOLD = 75;

// MediaPipe Hands landmark indices
const WRIST = 0;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const PINKY_MCP = 17;
const MIDDLE_TIP = 12;

const HISTORY_LIMIT = 6;

/** Rolling buffer of recent handedness detections, used to score consistency. */
let handednessHistory: Handedness[] = [];

/** Reset internal tracking state — call when a new training/practice session starts. */
export function resetPostureTracking(): void {
  handednessHistory = [];
}

function distance3d(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts an angular deviation (degrees away from the ideal angle) into a
 * 0-100 score. 0 deviation = 100 score; deviation >= toleranceDeg = 0 score.
 */
function scoreFromAngleDeviation(deviationDeg: number, toleranceDeg: number): number {
  const ratio = Math.abs(deviationDeg) / toleranceDeg;
  return clamp(Math.round((1 - ratio) * 100));
}

function isValidLandmarkSet(landmarks: HandLandmark[] | null | undefined): landmarks is HandLandmark[] {
  return Array.isArray(landmarks) && landmarks.length >= LANDMARK_COUNT;
}

/**
 * Normalizes raw landmark coordinates so posture comparisons are invariant
 * to where the hand sits in frame and how large/small it appears:
 *  - translates so the wrist sits at the origin
 *  - scales so the wrist -> middle-finger-MCP bone has unit length
 *
 * Returns an empty array if the input isn't a full 21-point hand.
 */
export function normalizeLandmarks(landmarks: HandLandmark[] | null | undefined): HandLandmark[] {
  if (!isValidLandmarkSet(landmarks)) return [];

  const wrist = landmarks[WRIST];
  const middleMcp = landmarks[MIDDLE_MCP];
  const scale = distance3d(wrist, middleMcp) || 1;

  return landmarks.map((point) => ({
    x: (point.x - wrist.x) / scale,
    y: (point.y - wrist.y) / scale,
    z: (point.z - wrist.z) / scale,
  }));
}

function buildGuidanceMessage(metrics: { rotate: number; tilt: number; distance: number; switchHands: number }): string {
  const entries: Array<[string, number, string]> = [
    ['rotate', metrics.rotate, 'Rotate your palm to face the camera'],
    ['tilt', metrics.tilt, 'Hold your hand more upright'],
    ['distance', metrics.distance, 'Adjust your distance from the camera'],
    ['switchHands', metrics.switchHands, 'Keep using the same hand throughout'],
  ];

  const weakest = entries.reduce((worst, current) => (current[1] < worst[1] ? current : worst));

  if (weakest[1] >= OPTIMAL_THRESHOLD) {
    return 'Great posture — hold steady';
  }

  return weakest[2];
}

/**
 * Evaluates the current hand posture against general "good framing" rules
 * (palm facing the camera, upright wrist, comfortable distance, consistent
 * hand across samples).
 *
 * @param landmarks Raw 21-point hand landmarks for the current frame, or
 *   `null`/`undefined` if no hand tracking result is available yet.
 * @param targetSymbol The sign/character currently being trained (reserved
 *   for future per-symbol reference postures; unused for the generic
 *   framing checks below).
 * @param handedness Optional detected handedness for this frame (e.g. from
 *   MediaPipe's handedness classification), used to score consistency.
 */
export function evaluateHandPosture(
  landmarks: HandLandmark[] | null | undefined,
  targetSymbol: string,
  handedness: Handedness = 'Unknown'
): PostureEvaluation {
  if (!isValidLandmarkSet(landmarks)) {
    return {
      rotate: 0,
      tilt: 0,
      distance: 0,
      switchHands: 0,
      guidanceMessage: 'No hand detected — position your hand inside the camera circle',
      isOptimal: false,
    };
  }

  const wrist = landmarks[WRIST];
  const indexMcp = landmarks[INDEX_MCP];
  const middleMcp = landmarks[MIDDLE_MCP];
  const pinkyMcp = landmarks[PINKY_MCP];
  const middleTip = landmarks[MIDDLE_TIP];

  // --- ROTATE: palm-normal alignment with the camera ---
  const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y, z: indexMcp.z - wrist.z };
  const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y, z: pinkyMcp.z - wrist.z };
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
  const normalMagnitude = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2) || 1;
  const facingRatio = Math.abs(normal.z) / normalMagnitude;
  const rotateDeviationDeg = (1 - facingRatio) * 90;
  const rotate = scoreFromAngleDeviation(rotateDeviationDeg, 45);

  // --- TILT: wrist-to-middle-fingertip vector vs. vertical ---
  const wristToMiddle = { x: middleTip.x - wrist.x, y: middleTip.y - wrist.y };
  const wristToMiddleLength = Math.sqrt(wristToMiddle.x ** 2 + wristToMiddle.y ** 2) || 1;
  const tiltDeviationDeg = (Math.abs(wristToMiddle.x) / wristToMiddleLength) * 90;
  const tilt = scoreFromAngleDeviation(tiltDeviationDeg, 40);

  // --- DISTANCE: hand size in frame ---
  const handSpan = distance3d(wrist, middleMcp);
  const IDEAL_SPAN_MIN = 0.15;
  const IDEAL_SPAN_MAX = 0.35;
  let distanceScore: number;
  if (handSpan < IDEAL_SPAN_MIN) {
    distanceScore = clamp(Math.round((handSpan / IDEAL_SPAN_MIN) * 100));
  } else if (handSpan > IDEAL_SPAN_MAX) {
    const overshoot = (handSpan - IDEAL_SPAN_MAX) / IDEAL_SPAN_MAX;
    distanceScore = clamp(Math.round((1 - overshoot) * 100));
  } else {
    distanceScore = 100;
  }

  // --- SWITCH HANDS: consistency of detected handedness across recent samples ---
  handednessHistory.push(handedness);
  if (handednessHistory.length > HISTORY_LIMIT) {
    handednessHistory.shift();
  }
  const knownSamples = handednessHistory.filter((h) => h !== 'Unknown');
  let switchHandsScore = 100;
  if (knownSamples.length > 1) {
    const changes = knownSamples.slice(1).reduce((count, hand, i) => (hand !== knownSamples[i] ? count + 1 : count), 0);
    switchHandsScore = clamp(100 - changes * 25);
  }

  const metrics = { rotate, tilt, distance: distanceScore, switchHands: switchHandsScore };
  const isOptimal = Object.values(metrics).every((score) => score >= OPTIMAL_THRESHOLD);

  return {
    ...metrics,
    guidanceMessage: buildGuidanceMessage(metrics),
    isOptimal,
  };
}