import type { Init, Outcome, ScoreEntry, SubmitResult } from "@vibe/protocol";

export type { Init, Outcome, ScoreEntry, SubmitResult };

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface EndResult {
  outcome: Outcome;
  score?: number;
}

/** The game-side API, available as the global `vibe`. */
export interface Vibe {
  readonly version: string;

  // ---- Lifecycle (required in every game) ----
  /** Resolves once the host has connected. Gives the player, context and initial state. */
  connect(): Promise<Init>;
  /** Report loading progress, 0..1. */
  loading(progress: number): void;
  /** Something meaningful is drawn; the host may swap its poster for the live frame. */
  firstFrame(): void;
  /** The game can accept input. */
  ready(): void;
  /** A run began (first input after ready, or after a restart). */
  start(): void;
  /** A run finished. */
  end(result: EndResult): void;

  onPause(cb: () => void): void;
  onResume(cb: () => void): void;
  /** The host owns mute. Called with the current value on connect and on every change. */
  onAudio(cb: (enabled: boolean) => void): void;
  /** In the feed the game runs unfocused (attract mode) until the player taps in. */
  onFocus(cb: (focused: boolean) => void): void;
  /** The host's "play again" button. */
  onRestart(cb: () => void): void;

  readonly paused: boolean;
  readonly audioEnabled: boolean;
  readonly focused: boolean;
  /** Available after connect(). */
  readonly player: Init["player"];
  readonly context: Init["context"];

  // ---- Capabilities (must be declared in game.json) ----
  saves: {
    get<T extends Json = Json>(key: string): Promise<T | null>;
    set(key: string, value: Json): Promise<void>;
  };
  scores: {
    submit(value: number, opts?: { board?: string }): Promise<SubmitResult>;
    top(opts?: {
      board?: string;
      scope?: "global" | "friends" | "today";
      limit?: number;
    }): Promise<ScoreEntry[]>;
    /** Ask the host to show its leaderboard overlay (with names). */
    show(opts?: { board?: string }): void;
  };
  events: {
    track(
      name: "level_start" | "level_end" | "tutorial_complete" | `custom.${string}`,
      props?: Record<string, string | number | boolean>,
    ): void;
  };
  share(opts?: { text?: string; score?: number }): void;

  // ---- Utilities ----
  /** Seeded PRNG returning floats in [0, 1). */
  random(seed: string): () => number;
  /** A fresh seed for a new run: the challenge seed when present, otherwise random. */
  newSeed(): string;
}

declare global {
  // eslint-disable-next-line no-var
  var vibe: Vibe;
}
