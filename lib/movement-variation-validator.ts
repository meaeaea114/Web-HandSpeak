import type { HandOrientation } from './posture-metrics';
import { SEQUENCE_LENGTH } from './gesture-sequence-model';

/**
 * Real, camera-verified validation for the guided capture-variation
 * instructions shown during LSTM training-data capture (Train mode, see
 * CAPTURE_VARIATION_STEPS in app/dashboard/teacher/content/page.tsx).
 *
 * Before this module, those instructions ("shift left", "move closer",
 * "wrist angle", etc.) were purely cosmetic text: whatever the trainer
 * actually did in front of the camera, the take was accepted as soon as
 * SEQUENCE_LENGTH frames were buffered. This module makes each instruction
 * an ACTUAL, measurable requirement checked against real per-frame MediaPipe
 * landmark data captured during that specific take — a take that doesn't
 * show the required real movement is rejected, not silently accepted.
 *
 * WHAT THIS DOES NOT DO:
 *  - It never fabricates, adjusts, or synthesizes landmark data. It only
 *    measures the real frames the trainer produced and decides whether they
 *    satisfy the instruction.
 *  - It never changes WHICH sign is being trained — variation validation is
 *    only about where/how the same sign was framed in the camera, exactly
 *    as the "GUIDED CAPTURE VARIATION" comment in content/page.tsx already
 *    documents.
 *  - It does not touch the 126-length feature vector stored for the LSTM
 *    (see posture-metrics.ts:landmarksToFeatureVector). That vector is
 *    deliberately translation/scale-invariant — which is exactly why it
 *    CANNOT be used to detect whether the trainer actually moved. This
 *    module works from a separate, RAW (non-normalized) per-frame metric
 *    tracked in parallel during recording, purely for this validation.
 */

export type VariationId =
  | 'natural'
  | 'shift_left'
  | 'shift_right'
  | 'move_higher'
  | 'move_lower'
  | 'move_closer'
  | 'move_farther'
  | 'wrist_angle'
  | 'rotate_tilt'
  | 'reposition';

/** One frame's worth of RAW (non-normalized) positional/orientation data —
 * everything needed to tell whether the hand actually moved the way an
 * instruction asked, in terms of the real camera frame. */
export interface RawFrameMetric {
  wristX: number; // 0..1, raw MediaPipe frame coordinate (landmark 0)
  wristY: number; // 0..1, raw MediaPipe frame coordinate (landmark 0)
  sizeRatio: number; // hand bbox area / ideal area — see posture-metrics.computeFramingQuality; bigger = closer to camera
  rollDeg: number;
  pitchDeg: number;
  yawDeg: number;
}

export function buildRawFrameMetric(
  wrist: { x: number; y: number },
  sizeRatio: number,
  orientation: HandOrientation
): RawFrameMetric {
  return {
    wristX: wrist.x,
    wristY: wrist.y,
    sizeRatio,
    rollDeg: orientation.rollDeg,
    pitchDeg: orientation.pitchDeg,
    yawDeg: orientation.yawDeg,
  };
}

type AxisId = 'wristX' | 'wristY' | 'sizeRatio' | 'rollDeg' | 'yawpitch' | 'euclidean' | 'none';

interface AxisRequirement {
  axis: AxisId;
  /** +1 = value must INCREASE beyond baseline by >= threshold; -1 = must
   * DECREASE by >= threshold; 0 = magnitude-only, either direction counts
   * (used for angles/repositioning where either sign is a real variation). */
  direction: 1 | -1 | 0;
  threshold: number;
}

/**
 * Thresholds are deliberately modest heuristic MINIMUMS ("...slightly...",
 * matching the instruction wording), not exact targets — the goal is to
 * reject a take where the trainer didn't really move at all (the trainer's
 * own example: "the trainer barely moves" -> "Actual displacement =
 * insufficient"), not to enforce one precise position. Units match
 * RawFrameMetric: wristX/Y and sizeRatio deltas are the same 0-1-ish
 * fractional scale posture-metrics.ts already uses elsewhere; angle deltas
 * are the same heuristic-proxy degrees computeHandOrientation produces.
 */
export const VARIATION_REQUIREMENTS: Record<VariationId, AxisRequirement> = {
  natural: { axis: 'none', direction: 0, threshold: 0 },
  shift_left: { axis: 'wristX', direction: -1, threshold: 0.05 },
  shift_right: { axis: 'wristX', direction: 1, threshold: 0.05 },
  move_higher: { axis: 'wristY', direction: -1, threshold: 0.05 },
  move_lower: { axis: 'wristY', direction: 1, threshold: 0.05 },
  move_closer: { axis: 'sizeRatio', direction: 1, threshold: 0.15 },
  move_farther: { axis: 'sizeRatio', direction: -1, threshold: 0.15 },
  wrist_angle: { axis: 'rollDeg', direction: 0, threshold: 8 },
  rotate_tilt: { axis: 'yawpitch', direction: 0, threshold: 8 },
  reposition: { axis: 'euclidean', direction: 0, threshold: 0.07 },
};

function averageMetric(frames: RawFrameMetric[]): RawFrameMetric {
  const n = frames.length || 1;
  const sum = frames.reduce(
    (acc, f) => ({
      wristX: acc.wristX + f.wristX,
      wristY: acc.wristY + f.wristY,
      sizeRatio: acc.sizeRatio + f.sizeRatio,
      rollDeg: acc.rollDeg + f.rollDeg,
      pitchDeg: acc.pitchDeg + f.pitchDeg,
      yawDeg: acc.yawDeg + f.yawDeg,
    }),
    { wristX: 0, wristY: 0, sizeRatio: 0, rollDeg: 0, pitchDeg: 0, yawDeg: 0 }
  );
  return {
    wristX: sum.wristX / n,
    wristY: sum.wristY / n,
    sizeRatio: sum.sizeRatio / n,
    rollDeg: sum.rollDeg / n,
    pitchDeg: sum.pitchDeg / n,
    yawDeg: sum.yawDeg / n,
  };
}

/** Signed delta (this take's average - baseline) along the axis a requirement cares about. */
function measureDelta(req: AxisRequirement, baseline: RawFrameMetric, avg: RawFrameMetric): number {
  switch (req.axis) {
    case 'wristX':
      return avg.wristX - baseline.wristX;
    case 'wristY':
      return avg.wristY - baseline.wristY;
    case 'sizeRatio':
      return avg.sizeRatio - baseline.sizeRatio;
    case 'rollDeg':
      return avg.rollDeg - baseline.rollDeg;
    case 'yawpitch': {
      const dYaw = avg.yawDeg - baseline.yawDeg;
      const dPitch = avg.pitchDeg - baseline.pitchDeg;
      return Math.abs(dYaw) >= Math.abs(dPitch) ? dYaw : dPitch;
    }
    case 'euclidean':
      return Math.hypot(avg.wristX - baseline.wristX, avg.wristY - baseline.wristY);
    case 'none':
    default:
      return 0;
  }
}

export interface VariationValidationResult {
  passed: boolean;
  variation: VariationId;
  measured: number; // signed delta for directional axes, magnitude for undirected ones
  required: number; // threshold that had to be reached
  progress: number; // measured-magnitude / required, e.g. 0.4 = 40% of the way there
  reason: string;
}

/**
 * Checks a take's real captured frames (so far, or the completed take)
 * against the instruction it is supposed to satisfy. `baseline` is the
 * average RawFrameMetric of the trainer's first ("Natural") accepted take
 * for this sign — every other instruction ("shift left", "move closer"...)
 * only means something relative to where the trainer naturally sits/frames
 * themselves, so it is always measured against that real baseline rather
 * than an absolute position.
 *
 * 'natural' always passes (it establishes the baseline, nothing to compare
 * it to). Any other variation passes only when the trainer's REAL, captured
 * hand position/scale/orientation moved far enough from baseline, in the
 * direction the instruction asked for — never based on the instruction text
 * alone.
 */
export function validateVariationTake(
  variation: VariationId,
  baseline: RawFrameMetric | null,
  takeFrames: RawFrameMetric[]
): VariationValidationResult {
  const req = VARIATION_REQUIREMENTS[variation];

  if (variation === 'natural' || !baseline || takeFrames.length === 0) {
    return {
      passed: true,
      variation,
      measured: 0,
      required: req.threshold,
      progress: 1,
      reason:
        variation === 'natural'
          ? 'Baseline take — establishes the reference position for later variation checks.'
          : 'No baseline yet to compare against.',
    };
  }

  const avg = averageMetric(takeFrames);
  const delta = measureDelta(req, baseline, avg);
  const magnitude = Math.abs(delta);
  const directionOk = req.direction === 0 || Math.sign(delta) === req.direction;
  const passed = magnitude >= req.threshold && directionOk;
  const progress = req.threshold > 0 ? magnitude / req.threshold : 1;

  let reason: string;
  if (passed) {
    reason = 'Real camera movement matched the instruction.';
  } else if (!directionOk && magnitude >= req.threshold * 0.3) {
    reason = 'Real movement detected, but not clearly in the direction this instruction asked for.';
  } else {
    reason = `Insufficient real movement detected (captured ${magnitude.toFixed(3)}, needs at least ${req.threshold}).`;
  }

  return { passed, variation, measured: delta, required: req.threshold, progress, reason };
}

/** Short, trainer-facing status line for live on-screen feedback while recording. */
export function variationLiveHint(result: VariationValidationResult, variationTitle: string): string {
  if (result.variation === 'natural') return `${variationTitle}: recording…`;
  if (result.passed) return `${variationTitle}: real movement detected ✓ — hold and Stop & Save`;
  const pct = Math.max(0, Math.min(100, Math.round(result.progress * 100)));
  return `${variationTitle}: ${pct}% of the required real movement so far — keep moving`;
}

/**
 * Specific, per-axis directional status for real-time on-screen feedback
 * (e.g. "Moving LEFT ✓" vs "Move LEFT" vs "Wrong way — that's RIGHT").
 *
 * Everything here is derived from `result.measured` — the REAL signed delta
 * `validateVariationTake` computed from actual captured MediaPipe frames for
 * this tick — never from which button is pressed, elapsed time, or the
 * instruction text alone. This is what fixes the "told to move LEFT while
 * already moving LEFT" problem: the direction reported is always what the
 * camera measured just now, so if the trainer is already correctly moving
 * left, the feedback reflects that instead of repeating a static prompt.
 */
export type LiveDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'closer'
  | 'farther'
  | 'rotating'
  | 'sideways'
  | 'holding_still'
  | 'wrong_direction'
  | 'insufficient'
  | 'sufficient';

export interface LiveMovementFeedback {
  direction: LiveDirection;
  /** Human-readable word for whichever way the camera actually measured movement (e.g. "LEFT", "CLOSER", "sideways"). */
  axisWord: string;
  message: string;
}

function axisDirectionWord(req: AxisRequirement, signedValue: number): { word: string; direction: LiveDirection } {
  switch (req.axis) {
    case 'wristX':
      return signedValue < 0 ? { word: 'LEFT', direction: 'left' } : { word: 'RIGHT', direction: 'right' };
    case 'wristY':
      return signedValue < 0 ? { word: 'UP', direction: 'up' } : { word: 'DOWN', direction: 'down' };
    case 'sizeRatio':
      return signedValue > 0 ? { word: 'CLOSER', direction: 'closer' } : { word: 'FARTHER', direction: 'farther' };
    case 'rollDeg':
      return { word: 'wrist angle', direction: 'rotating' };
    case 'yawpitch':
      return { word: 'rotation/tilt', direction: 'rotating' };
    case 'euclidean':
      return { word: 'sideways', direction: 'sideways' };
    default:
      return { word: 'movement', direction: 'insufficient' };
  }
}

export function liveDirectionalFeedback(
  variation: VariationId,
  result: VariationValidationResult
): LiveMovementFeedback {
  const req = VARIATION_REQUIREMENTS[variation];

  if (variation === 'natural') {
    return { direction: 'holding_still', axisWord: 'steady', message: 'Recording — hold the sign steady…' };
  }

  const magnitude = Math.abs(result.measured);
  const nearZero = magnitude < result.required * 0.15;

  if (result.passed) {
    const { word } = axisDirectionWord(req, result.measured);
    return { direction: 'sufficient', axisWord: word, message: `Moving ${word} ✓ — captured` };
  }

  if (nearZero) {
    return { direction: 'holding_still', axisWord: 'still', message: 'Not moving yet — perform the movement now' };
  }

  const directionOk = req.direction === 0 || Math.sign(result.measured) === req.direction;
  if (!directionOk) {
    const actual = axisDirectionWord(req, result.measured);
    const wanted = axisDirectionWord(req, req.direction);
    return {
      direction: 'wrong_direction',
      axisWord: actual.word,
      message: `Moving ${actual.word} — wrong way, this needs ${wanted.word}`,
    };
  }

  const { word } = axisDirectionWord(req, result.measured);
  const pct = Math.max(0, Math.min(100, Math.round(result.progress * 100)));
  return { direction: 'insufficient', axisWord: word, message: `Moving ${word} — ${pct}% there, keep going` };
}

/**
 * Rolling buffer of RAW per-frame metrics for one active take, kept in sync
 * (same window length) with FrameSequenceBuffer (lib/gesture-sequence-model.ts)
 * so "the last SEQUENCE_LENGTH raw metrics" always corresponds to "the last
 * SEQUENCE_LENGTH feature-vector frames" that a Stop & Save would snapshot.
 */
export class RawMetricBuffer {
  private frames: RawFrameMetric[] = [];

  push(metric: RawFrameMetric) {
    this.frames.push(metric);
    if (this.frames.length > SEQUENCE_LENGTH) {
      this.frames.shift();
    }
  }

  /** Returns a copy of the buffered raw metrics — use this to validate a take. */
  snapshot(): RawFrameMetric[] {
    return this.frames.map((f) => ({ ...f }));
  }

  clear() {
    this.frames = [];
  }

  get length() {
    return this.frames.length;
  }
}

/**
 * Holds the one real baseline RawFrameMetric a training session establishes
 * from its first accepted ("Natural") take. Reset whenever a fresh Train
 * session starts (new sign, or re-entering Train mode) so a previous sign's
 * baseline never leaks into this one's variation checks.
 */
export class VariationBaselineTracker {
  private baseline: RawFrameMetric | null = null;

  set(frames: RawFrameMetric[]) {
    this.baseline = frames.length ? averageMetric(frames) : null;
  }

  get(): RawFrameMetric | null {
    return this.baseline;
  }

  reset() {
    this.baseline = null;
  }
}