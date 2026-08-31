/**
 * Replaces the old pose-based MultiViewCaptureSession (lib/multi-view-capture.ts).
 * An LSTM needs full temporal sequences of a gesture being PERFORMED, not
 * static held poses from three fixed angles — so this session just
 * accumulates "takes," each one a full SEQUENCE_LENGTH-frame sequence
 * captured while the user actively signs, sourced from FrameSequenceBuffer
 * (see lib/gesture-sequence-model.ts).
 *
 * Usage pattern in the UI:
 *   1. User clicks "Record Take" -> clear the rolling buffer, set isRecordingTake=true
 *   2. User performs the full sign naturally in front of the camera
 *   3. User clicks "Stop & Save" -> the caller runs the take's captured frames
 *      through validateVariationTake() (see lib/movement-variation-validator.ts)
 *      BEFORE calling addTake — a take that doesn't show the real, camera-
 *      measured movement its instruction asked for is never added here.
 *   4. Repeat until requiredTakes is reached (or submit early with partial data)
 */

/** Optional provenance record for a take: which variation instruction it was
 * captured under, and the real measured camera data that proved the trainer
 * satisfied it. Purely informational (e.g. for admin review) — never
 * required, never affects the stored sequence itself. */
export interface TakeValidationRecord {
  variation: string;
  passed: boolean;
  measured: number;
  required: number;
}

export class GestureRecordingSession {
  private takes: number[][][] = [];
  private validations: (TakeValidationRecord | null)[] = [];

  constructor(private requiredTakes: number = 15) {}

  /** Records one full sequence (SEQUENCE_LENGTH frames x FEATURE_VECTOR_LENGTH features) as a take.
   * `validation`, if provided, should already reflect a PASSED real-movement check —
   * this method does not itself validate, it only stores what the caller already verified. */
  addTake(sequence: number[][], validation?: TakeValidationRecord) {
    this.takes.push(sequence);
    this.validations.push(validation ?? null);
  }

  removeTake(index: number) {
    this.takes.splice(index, 1);
    this.validations.splice(index, 1);
  }

  /** Real-movement validation provenance, one entry per take (same order/index as getAllTakes()). */
  getTakeValidations(): (TakeValidationRecord | null)[] {
    return this.validations;
  }

  get progress(): { captured: number; required: number } {
    return { captured: this.takes.length, required: this.requiredTakes };
  }

  get isComplete(): boolean {
    return this.takes.length >= this.requiredTakes;
  }

  /** All captured takes, one entry per recorded repetition of the sign. */
  getAllTakes(): number[][][] {
    return this.takes;
  }

  totalCaptured(): number {
    return this.takes.length;
  }

  totalRequired(): number {
    return this.requiredTakes;
  }
}