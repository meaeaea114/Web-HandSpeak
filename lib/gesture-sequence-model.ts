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

export const SEQUENCE_LENGTH = 30; // ~1 second at 30fps, or ~2s at 15fps sampling

export interface GesturePrediction {
  label: string;
  confidence: number;
  isCorrect: boolean;
}

let model: tf.LayersModel | null = null;
let labelList: string[] = [];
let loadingPromise: Promise<void> | null = null;

/**
 * Loads the model + its label map once. Call this when the training/practice
 * modal first mounts, not on every frame.
 *
 * Expects two files served alongside each other:
 *   /models/gesture_lstm/model.json   (+ its .bin weight shards)
 *   /models/gesture_lstm/labels.json  (string[] in class-index order)
 */
export async function loadGestureSequenceModel(
  modelUrl = '/models/gesture_lstm/model.json',
  labelsUrl = '/models/gesture_lstm/labels.json'
): Promise<void> {
  if (model && labelList.length) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [loadedModel, labelsResp] = await Promise.all([
      tf.loadLayersModel(modelUrl),
      fetch(labelsUrl).then((r) => r.json()),
    ]);
    model = loadedModel;
    labelList = labelsResp as string[];
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