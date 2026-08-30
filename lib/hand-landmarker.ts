'use client';

/**
 * Singleton wrapper around MediaPipe Tasks Vision HandLandmarker.
 * Loads the WASM runtime + model once, then reuses it across the app.
 *
 * npm install @mediapipe/tasks-vision
 */
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

export type Landmark = { x: number; y: number; z: number };

let handLandmarkerInstance: HandLandmarker | null = null;
let loadingPromise: Promise<HandLandmarker> | null = null;

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * Idempotent loader — safe to call from multiple components/effects.
 * Returns the same in-flight promise if a load is already underway.
 */
export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarkerInstance) return handLandmarkerInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    handLandmarkerInstance = landmarker;
    return landmarker;
  })();

  return loadingPromise;
}

/**
 * Runs detection on a single video frame. Must be called with monotonically
 * increasing timestamps (performance.now() works) since runningMode is VIDEO.
 * Returns null if no hand is detected in this frame.
 */
export function detectHandsInFrame(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): HandLandmarkerResult | null {
  if (video.readyState < 2) return null;
  const result = landmarker.detectForVideo(video, timestampMs);
  if (!result.landmarks || result.landmarks.length === 0) return null;
  return result;
}

/** Releases the underlying MediaPipe task graph. Call on final app teardown, not per-modal-close. */
export function disposeHandLandmarker() {
  handLandmarkerInstance?.close();
  handLandmarkerInstance = null;
  loadingPromise = null;
}