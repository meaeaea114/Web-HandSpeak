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
 *   3. User clicks "Stop & Save" -> snapshot the buffer's last SEQUENCE_LENGTH
 *      frames into this session as one take
 *   4. Repeat until requiredTakes is reached (or submit early with partial data)
 */
export class GestureRecordingSession {
  private takes: number[][][] = [];

  constructor(private requiredTakes: number = 15) {}

  /** Records one full sequence (SEQUENCE_LENGTH frames x FEATURE_VECTOR_LENGTH features) as a take. */
  addTake(sequence: number[][]) {
    this.takes.push(sequence);
  }

  removeTake(index: number) {
    this.takes.splice(index, 1);
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