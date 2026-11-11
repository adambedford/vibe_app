/**
 * Tiny synthesized sound effects (no audio files). The host owns mute: games only play
 * when vibe says audio is enabled, and browsers only allow sound after a tap.
 */
type Wave = OscillatorType;

export interface Tone {
  wave: Wave;
  from: number;
  to: number;
  ms: number;
  gain?: number;
  noise?: boolean;
}

export const SOUNDS: Record<string, Tone> = {
  jump: { wave: "square", from: 330, to: 660, ms: 120, gain: 0.08 },
  double: { wave: "square", from: 520, to: 1040, ms: 120, gain: 0.07 },
  land: { wave: "triangle", from: 140, to: 90, ms: 70, gain: 0.12 },
  score: { wave: "sine", from: 880, to: 1320, ms: 90, gain: 0.08 },
  die: { wave: "sawtooth", from: 320, to: 60, ms: 420, gain: 0.12, noise: true },
};

export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = false;

  /** Call from a user gesture inside the game (browsers require one per frame on iOS). */
  unlock() {
    if (!this.enabled) return;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on && this.ctx?.state === "running") void this.ctx.suspend();
    if (on && this.ctx?.state === "suspended") void this.ctx.resume();
  }

  play(name: keyof typeof SOUNDS) {
    const t = SOUNDS[name];
    const ctx = this.ctx;
    if (!t || !ctx || !this.enabled || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const end = now + t.ms / 1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(t.gain ?? 0.1, now);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    g.connect(ctx.destination);
    const o = ctx.createOscillator();
    o.type = t.wave;
    o.frequency.setValueAtTime(t.from, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), end);
    o.connect(g);
    o.start(now);
    o.stop(end);
    if (t.noise) {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * (t.ms / 1000)), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const n = ctx.createBufferSource();
      n.buffer = buf;
      n.connect(g);
      n.start(now);
    }
  }
}
