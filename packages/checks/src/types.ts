/**
 * What a template's playtest.ts exports. The checks run it two ways:
 *  - headless: bundled and run in a locked-down VM (no clock, no Math.random, no DOM)
 *    to prove the rules are pure and deterministic, and that a run can finish;
 *  - in the browser: `browser` (optional) drives the real game through the host.
 */
export interface Status {
  phase: string;
  score: number;
}

export interface Playtest<S = unknown, A = unknown> {
  init(seed: string): S;
  step(s: S, a: A): S;
  status(s: S): Status;
  /** Phases that mean the run has finished. */
  donePhases: string[];
  /** Real-time games: the action that advances one tick, and how many ticks a second. */
  tick?: A;
  ticksPerSecond?: number;
  /** A random action for fuzzing (called before every tick for real-time games). Null = none. */
  randomAction(s: S, rand: () => number): A | null;
  /** A competent bot used to prove a run can finish. Defaults to randomAction. */
  botAction?(s: S, rand: () => number): A | null;
  /** Give up after this much simulated play (real-time) or this many actions (turn-based). */
  maxSeconds?: number;
  maxActions?: number;
  /** Custom browser playthrough; without it the harness uses a generic bot for the game's input kind. */
  browser?(d: Driver): Promise<void>;
}

/** What a browser playthrough can do. Coordinates are fractions of the game frame. */
export interface Driver {
  tap(x: number, y: number): Promise<void>;
  drag(path: [number, number][], ms: number): Promise<void>;
  key(key: string): Promise<void>;
  /** Click an element inside the game frame. */
  click(selector: string): Promise<void>;
  /** Run a function inside the game frame. Only works in test mode hooks the game exposes. */
  evaluate<T>(fn: () => T): Promise<T>;
  wait(ms: number): Promise<void>;
  /** True once the game has sent `end`. */
  ended(): boolean;
  rand(): number;
}
