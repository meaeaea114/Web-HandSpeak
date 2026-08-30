import type { HandOrientation } from './posture-metrics';

export type ViewId = 'front' | 'left_side' | 'right_side';

export interface ViewStageConfig {
  id: ViewId;
  label: string;
  instruction: string;
  yawRange: [number, number];
  pitchRange: [number, number];
  requiredSamples: number;
}

/**
 * Default three-view capture plan. Training on front + both side views per
 * sign gives the LSTM real viewpoint diversity instead of a single flat
 * angle — this is the "strong foundation" input the model actually needs.
 * Tune the yaw/pitch ranges against your own camera setup if they feel off;
 * they're heuristic proxies (see posture-metrics.ts), not calibrated degrees.
 */
export const DEFAULT_VIEW_STAGES: ViewStageConfig[] = [
  {
    id: 'front',
    label: 'Front View',
    instruction: 'Face your palm directly at the camera',
    yawRange: [-15, 15],
    pitchRange: [-20, 20],
    requiredSamples: 5,
  },
  {
    id: 'left_side',
    label: 'Left Side View',
    instruction: 'Turn your hand to show its LEFT side to the camera',
    yawRange: [30, 75],
    pitchRange: [-25, 25],
    requiredSamples: 5,
  },
  {
    id: 'right_side',
    label: 'Right Side View',
    instruction: 'Turn your hand to show its RIGHT side to the camera',
    yawRange: [-75, -30],
    pitchRange: [-25, 25],
    requiredSamples: 5,
  },
];

export function isOrientationInStage(orientation: HandOrientation, stage: ViewStageConfig): boolean {
  const { yawDeg, pitchDeg } = orientation;
  return (
    yawDeg >= stage.yawRange[0] &&
    yawDeg <= stage.yawRange[1] &&
    pitchDeg >= stage.pitchRange[0] &&
    pitchDeg <= stage.pitchRange[1]
  );
}

/** Produces a specific, actionable instruction based on which way orientation is off. */
export function guidanceForStage(orientation: HandOrientation, stage: ViewStageConfig): string {
  if (isOrientationInStage(orientation, stage)) {
    return `${stage.label} looks good ✓ Hold steady…`;
  }
  const { yawDeg, pitchDeg } = orientation;
  if (yawDeg < stage.yawRange[0]) return `Turn a bit more to show your LEFT side (currently ${Math.round(yawDeg)}°)`;
  if (yawDeg > stage.yawRange[1]) return `Turn a bit more to show your RIGHT side (currently ${Math.round(yawDeg)}°)`;
  if (pitchDeg < stage.pitchRange[0]) return 'Tilt your hand up slightly';
  if (pitchDeg > stage.pitchRange[1]) return 'Tilt your hand down slightly';
  return stage.instruction;
}

/**
 * Tracks progress through the required capture views for one training
 * session (one lesson, one sitting). Create a fresh instance whenever Train
 * mode is (re)entered so a previous lesson's captured data never leaks in.
 */
export class MultiViewCaptureSession {
  private stageIndex = 0;
  private samplesByView: Record<ViewId, number[][][]>;

  constructor(private stages: ViewStageConfig[] = DEFAULT_VIEW_STAGES) {
    this.samplesByView = {} as Record<ViewId, number[][][]>;
    stages.forEach((s) => {
      this.samplesByView[s.id] = [];
    });
  }

  get currentStage(): ViewStageConfig | null {
    return this.stages[this.stageIndex] ?? null;
  }

  get isComplete(): boolean {
    return this.stageIndex >= this.stages.length;
  }

  get progress(): { view: ViewId; label: string; captured: number; required: number }[] {
    return this.stages.map((s) => ({
      view: s.id,
      label: s.label,
      captured: this.samplesByView[s.id].length,
      required: s.requiredSamples,
    }));
  }

  /** Records one accepted sequence for whichever stage is currently active; auto-advances when that stage's quota is met. */
  captureForCurrentStage(sequence: number[][]) {
    const stage = this.currentStage;
    if (!stage) return;
    this.samplesByView[stage.id].push(sequence);
    if (this.samplesByView[stage.id].length >= stage.requiredSamples) {
      this.stageIndex += 1;
    }
  }

  getAllSamples(): { view: ViewId; sequences: number[][][] }[] {
    return this.stages.map((s) => ({ view: s.id, sequences: this.samplesByView[s.id] }));
  }

  /** Flat list of every captured sequence regardless of view — handy for template-matching, which doesn't care about view labels. */
  getAllSequencesFlat(): number[][][] {
    return this.stages.flatMap((s) => this.samplesByView[s.id]);
  }

  totalCaptured(): number {
    return this.stages.reduce((sum, s) => sum + this.samplesByView[s.id].length, 0);
  }

  totalRequired(): number {
    return this.stages.reduce((sum, s) => sum + s.requiredSamples, 0);
  }
}