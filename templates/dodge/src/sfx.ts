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
  start: { wave: "sine", from: 440, to: 880, ms: 160, gain: 0.07 },
  star: { wave: "square", from: 988, to: 1480, ms: 110, gain: 0.07 },
  die: { wave: "sawtooth", from: 300, to: 50, ms: 480, gain: 0.12, noise: true },
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
