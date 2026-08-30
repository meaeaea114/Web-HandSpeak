/**
 * Template-matching correctness check using Dynamic Time Warping (DTW).
 *
 * Why this exists: an LSTM needs many labeled examples per sign before it's
 * reliable, and you won't have that on day one. DTW lets you compare a live
 * captured sequence directly against the reference sample(s) an instructor
 * already recorded in Train mode — so correctness checking works from the
 * very first approved sample, and can run alongside (or instead of) the LSTM.
 *
 * Once you've accumulated enough samples per gesture, you can swap this out
 * for (or blend it with) gesture-sequence-model.ts's LSTM prediction —
 * both consume the same 126-length feature vectors, so nothing else changes.
 */
import { FEATURE_VECTOR_LENGTH, normalizeFeatureVector } from './posture-metrics';

export interface TemplateMatchResult {
  isCorrect: boolean;
  confidence: number; // 0-1, higher = closer match
  bestReferenceIndex: number;
}

/**
 * Normalizes every frame of a sequence so matching is invariant to where in
 * the frame the hand is, and how close to the camera it is. Delegates to
 * posture-metrics.ts's normalizeFeatureVector — the exact same transform
 * used when a feature vector is first created (see landmarksToFeatureVector)
 * — so training data, storage, and this live comparison always share one
 * definition. Because that transform is idempotent, calling it again here on
 * already-normalized frames (the normal case now) is a safe no-op; it only
 * does real work if it's ever given an un-normalized sequence.
 */
function normalizeSequence(sequence: number[][]): number[][] {
  return sequence.map((frame) => normalizeFeatureVector(frame));
}

function frameDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Classic DTW: finds the cheapest alignment between two sequences that may
 * differ in length or timing (e.g. you signed it slightly faster/slower than
 * the reference), and returns the total accumulated distance along that
 * alignment. Lower = more similar.
 */
function dtwDistance(seqA: number[][], seqB: number[][]): number {
  const n = seqA.length;
  const m = seqB.length;
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  cost[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const d = frameDistance(seqA[i - 1], seqB[j - 1]);
      cost[i][j] = d + Math.min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1]);
    }
  }

  // Normalize by path length so longer sequences aren't unfairly penalized.
  return cost[n][m] / (n + m);
}

/**
 * Compares a live-captured sequence against one or more reference sequences
 * for the target sign and returns whether it's a confident match.
 *
 * @param liveSequence        the buffered frames from FrameSequenceBuffer.snapshot()
 * @param referenceSequences  approved training samples for the target gesture
 * @param distanceThreshold   empirical cutoff below which frames count as a match —
 *                            tune this per-deployment once you have real data;
 *                            0.55 is a reasonable starting point for normalized coords
 */
export function matchGestureTemplate(
  liveSequence: number[][],
  referenceSequences: number[][][],
  distanceThreshold = 0.55
): TemplateMatchResult | null {
  if (referenceSequences.length === 0) return null;
  if (liveSequence.some((f) => f.length !== FEATURE_VECTOR_LENGTH)) {
    throw new Error(`Expected frames of length ${FEATURE_VECTOR_LENGTH}`);
  }

  const normalizedLive = normalizeSequence(liveSequence);

  let bestDistance = Infinity;
  let bestIndex = -1;

  referenceSequences.forEach((ref, idx) => {
    const normalizedRef = normalizeSequence(ref);
    const distance = dtwDistance(normalizedLive, normalizedRef);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = idx;
    }
  });

  // Convert distance to a 0-1 confidence score (monotonically decreasing).
  const confidence = Math.max(0, 1 - bestDistance / distanceThreshold);

  return {
    isCorrect: bestDistance <= distanceThreshold,
    confidence: Math.min(1, confidence),
    bestReferenceIndex: bestIndex,
  };
}