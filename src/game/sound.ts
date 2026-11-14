class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(next: boolean): void {
    this.muted = next;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    gainVal: number,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playSteer(): void {
    this.tone(240, 320, 0.06, 'triangle', 0.05);
  }

  public playCorrect(streak: number): void {
    const pitchLift = Math.min(streak, 6) * 24;
    this.tone(520 + pitchLift, 660 + pitchLift, 0.1, 'sine', 0.11, 0);
    this.tone(660 + pitchLift, 880 + pitchLift, 0.16, 'triangle', 0.1, 0.07);
  }

  public playWrong(): void {
    this.tone(190, 95, 0.22, 'sawtooth', 0.09, 0);
    this.tone(140, 75, 0.24, 'square', 0.06, 0.05);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.tone(n, n * 1.02, 0.22, 'triangle', 0.11, i * 0.09);
    });
  }

  public playGameOver(): void {
    this.tone(320, 210, 0.18, 'sawtooth', 0.08, 0);
    this.tone(210, 120, 0.3, 'sawtooth', 0.08, 0.16);
  }
}

export const soundEngine = new SoundEngine();
