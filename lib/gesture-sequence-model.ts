'use client';

/**
 * Loads a TF.js LSTM model (trained offline — see scripts/train_gesture_lstm.py)
 * and runs sliding-window sequence prediction so both static signs and
 * multi-step phrases can be scored for correctness.
 *
 * npm install @tensorflow/tfjs
 */
import * as tf from '@tensorflow/tfjs';
import { FEATURE_VECTOR_LENGTH } from './posture-metrics';

export const SEQUENCE_LENGTH = 30; // ~30 frames per take, captured at the app's ~8/sec detection rate (see DETECTION_INTERVAL_MS in content/page.tsx) — NOT 1s at 30fps

export interface GesturePrediction {
  label: string;
  confidence: number;
  isCorrect: boolean;
}

let model: tf.LayersModel | null = null;
let labelList: string[] = [];
let loadingPromise: Promise<void> | null = null;

/** True once loadGestureSequenceModel() has run and found no model deployed
 * at all (e.g. a 404 on model.json) — as opposed to it never having been
 * called yet, or a real network/parse failure. UI code can use this to show
 * "no model trained yet" instead of a generic error. */
let modelKnownAbsent = false;
export function isGestureModelKnownAbsent(): boolean {
  return modelKnownAbsent;
}

/**
 * Loads the model + its label map once. Call this when the training/practice
 * modal first mounts, not on every frame.
 *
 * Expects two files served alongside each other:
 *   /models/gesture_lstm/model.json   (+ its .bin weight shards)
 *   /models/gesture_lstm/labels.json  (string[] in class-index order)
 *
 * Until a model has actually been trained and deployed (see
 * scripts/train_gesture_lstm.py + scripts/export-training-dataset.js), this
 * URL simply won't exist — that's an expected, documented state, not a bug.
 * We check for it with a quiet HEAD request first so that state resolves
 * silently (no thrown Error, no failed-request noise) instead of letting
 * tf.loadLayersModel() attempt a full GET and throw.
 */
export async function loadGestureSequenceModel(
  modelUrl = '/models/gesture_lstm/model.json',
  labelsUrl = '/models/gesture_lstm/labels.json'
): Promise<void> {
  if (model && labelList.length) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    let exists = true;
    try {
      const head = await fetch(modelUrl, { method: 'HEAD' });
      exists = head.ok;
    } catch {
      exists = false;
    }

    if (!exists) {
      modelKnownAbsent = true;
      // eslint-disable-next-line no-console
      console.info(
        'No LSTM model deployed yet at', modelUrl,
        '— using DTW template-match fallback instead. This is expected until a model is trained and exported (see scripts/train_gesture_lstm.py).'
      );
      return;
    }

    const [loadedModel, labelsResp] = await Promise.all([
      tf.loadLayersModel(modelUrl),
      fetch(labelsUrl).then((r) => r.json()),
    ]);
    model = loadedModel;
    labelList = labelsResp as string[];
    modelKnownAbsent = false;
  })();

  return loadingPromise;
}

export function isGestureModelReady(): boolean {
  return model !== null && labelList.length > 0;
}

/**
 * A rolling buffer of per-frame feature vectors for one active session
 * (one lesson/modal instance). Create a fresh instance per session so
 * buffers from a previous lesson never leak into a new prediction.
 */
export class FrameSequenceBuffer {
  private frames: number[][] = [];

  push(featureVector: number[]) {
    if (featureVector.length !== FEATURE_VECTOR_LENGTH) {
      throw new Error(
        `Expected feature vector of length ${FEATURE_VECTOR_LENGTH}, got ${featureVector.length}`
      );
    }
    this.frames.push(featureVector);
    if (this.frames.length > SEQUENCE_LENGTH) {
      this.frames.shift();
    }
  }

  isFull(): boolean {
    return this.frames.length === SEQUENCE_LENGTH;
  }

  /** Returns a copy of the buffered frames — use this to persist a training sample. */
  snapshot(): number[][] {
    return this.frames.map((f) => [...f]);
  }

  clear() {
    this.frames = [];
  }

  get length() {
    return this.frames.length;
  }
}

/**
 * Runs the LSTM over the current buffered window and returns the predicted
 * label + confidence, plus whether it matches the expected target label.
 * Returns null if the model isn't loaded yet or the buffer isn't full.
 */
export function predictGesture(
  buffer: FrameSequenceBuffer,
  targetLabel: string,
  confidenceThreshold = 0.7
): GesturePrediction | null {
  if (!model || !labelList.length || !buffer.isFull()) return null;

  return tf.tidy(() => {
    const input = tf.tensor3d([buffer.snapshot()]); // [1, SEQUENCE_LENGTH, FEATURE_VECTOR_LENGTH]
    const output = model!.predict(input) as tf.Tensor;
    const probs = output.dataSync();

    let bestIdx = 0;
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > probs[bestIdx]) bestIdx = i;
    }

    const label = labelList[bestIdx] ?? 'unknown';
    const confidence = probs[bestIdx];

    return {
      label,
      confidence,
      isCorrect: label === targetLabel && confidence >= confidenceThreshold,
    };
  });
}

export function disposeGestureSequenceModel() {
  model?.dispose();
  model = null;
  labelList = [];
  loadingPromise = null;
}