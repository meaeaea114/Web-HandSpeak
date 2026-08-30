/**
 * Exponential moving average smoothing for noisy per-frame signals.
 * Raw MediaPipe landmarks jitter frame-to-frame even when your hand is
 * perfectly still — without smoothing, any angle/score derived from them
 * will visibly "jump around" even though nothing changed. This is what was
 * causing the posture metrics to look like they moved randomly.
 */
export class ExponentialSmoother {
  private value: number | null = null;

  /** alpha closer to 1 = more responsive/less smooth; closer to 0 = smoother/slower to react. */
  constructor(private alpha: number = 0.25) {}

  update(raw: number): number {
    this.value = this.value === null ? raw : this.alpha * raw + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset() {
    this.value = null;
  }

  get current(): number | null {
    return this.value;
  }
}

/** Smooths several named numeric channels together (e.g. { yaw, pitch, roll }). */
export class MultiChannelSmoother<K extends string> {
  private smoothers = {} as Record<K, ExponentialSmoother>;

  constructor(channels: K[], alpha = 0.25) {
    channels.forEach((c) => {
      this.smoothers[c] = new ExponentialSmoother(alpha);
    });
  }

  update(values: Record<K, number>): Record<K, number> {
    const out = {} as Record<K, number>;
    (Object.keys(values) as K[]).forEach((key) => {
      out[key] = this.smoothers[key].update(values[key]);
    });
    return out;
  }

  reset() {
    (Object.keys(this.smoothers) as K[]).forEach((k) => this.smoothers[k].reset());
  }
}