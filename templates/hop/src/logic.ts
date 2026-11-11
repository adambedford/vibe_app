/**
 * Hop rules. Pure and deterministic: state + action -> state. No clock, DOM, network,
 * Math.random or engine calls; randomness comes from the seeded generator in the state.
 * The renderer (main.ts) steps this at a fixed 60 ticks a second and draws the result.
 */
import { CONFIG as C } from "./config.ts";

export const W = 360;
export const H = 640;
export const GROUND = 520;
export const PLAYER_X = 90;
export const PLAYER_SIZE = 36;
export const TICK_MS = 1000 / 60;

export interface Obstacle {
  id: number;
  x: number;
  w: number;
  h: number;
  passed: boolean;
}

export type HopEvent = "start" | "jump" | "double" | "land" | "score" | "spawn" | "die";

export interface State {
  tick: number;
  rng: number;
  phase: "ready" | "play" | "over";
  /** Bottom of the player. */
  y: number;
  vy: number;
  grounded: boolean;
  jumps: number;
  obstacles: Obstacle[];
  nextId: number;
  speed: number;
  untilSpawn: number;
  score: number;
  /** Effects for the renderer; cleared at the start of every step. */
  events: HopEvent[];
}

export type Action = { type: "tick" } | { type: "tap" };

function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rand(s: State): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function between(s: State, [lo, hi]: [number, number]): number {
  return lo + rand(s) * (hi - lo);
}

export function init(seed: string): State {
  return {
    tick: 0,
    rng: hash(seed),
    phase: "ready",
    y: GROUND,
    vy: 0,
    grounded: true,
    jumps: 0,
    obstacles: [],
    nextId: 1,
    speed: C.startSpeed,
    untilSpawn: C.startSpeed * 40,
    score: 0,
    events: [],
  };
}

export function status(s: State) {
  return { phase: s.phase, score: s.score };
}

function jump(s: State) {
  if (s.grounded) {
    s.vy = C.jumpVelocity;
    s.grounded = false;
    s.jumps = 1;
    s.events.push("jump");
  } else if (C.doubleJump && s.jumps < 2) {
    s.vy = C.doubleJumpVelocity;
    s.jumps = 2;
    s.events.push("double");
  }
}

export function step(s: State, a: Action): State {
  s.events = [];
  if (a.type === "tap") {
    if (s.phase === "ready") {
      s.phase = "play";
      s.events.push("start");
      jump(s);
    } else if (s.phase === "play") {
      jump(s);
    }
    return s;
  }

  if (s.phase !== "play") return s;
  s.tick++;

  // Player
  s.vy += C.gravity;
  s.y += s.vy;
  if (s.y >= GROUND) {
    s.y = GROUND;
    s.vy = 0;
    if (!s.grounded) s.events.push("land");
    s.grounded = true;
    s.jumps = 0;
  }

  // Obstacles
  for (const o of s.obstacles) {
    o.x -= s.speed;
    if (!o.passed && o.x + o.w < PLAYER_X) {
      o.passed = true;
      s.score++;
      s.events.push("score");
    }
  }
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -20);
  s.speed = Math.min(C.maxSpeed, C.startSpeed + s.score * C.speedPerPoint);

  s.untilSpawn -= s.speed;
  if (s.untilSpawn <= 0) {
    const wide = s.score >= C.wideAfter && rand(s) < C.wideChance;
    s.obstacles.push({
      id: s.nextId++,
      x: W + 10,
      w: Math.round(between(s, wide ? C.wideWidth : C.obstacleWidth)),
      h: Math.round(between(s, C.obstacleHeight)),
      passed: false,
    });
    s.untilSpawn = s.speed * between(s, [C.gapTicksMin, C.gapTicksMax]);
    s.events.push("spawn");
  }

  // Collision (hitbox a little smaller than the drawing, for fairness)
  const pl = PLAYER_X + 5;
  const pr = PLAYER_X + PLAYER_SIZE - 5;
  const pt = s.y - PLAYER_SIZE + 5;
  const pb = s.y - 2;
  for (const o of s.obstacles) {
    if (pr > o.x && pl < o.x + o.w && pb > GROUND - o.h && pt < GROUND) {
      s.phase = "over";
      s.events.push("die");
      break;
    }
  }
  return s;
}

/** Would the player crash within `ticks` if it taps on the given tick offsets (and never otherwise)? */
function crashes(s: State, tapsAt: number[], ticks: number): boolean {
  let t: State = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < ticks; i++) {
    if (tapsAt.includes(i)) t = step(t, { type: "tap" });
    t = step(t, { type: "tick" });
    if (t.phase === "over") return true;
  }
  return false;
}

/**
 * A bot that looks ahead: tap only if doing nothing would crash and tapping now would not.
 * Used for attract mode in the feed and by the checks. It is good, not perfect.
 */
export function botShouldTap(s: State): boolean {
  if (s.phase === "ready") return true;
  if (s.phase !== "play") return false;
  if (!crashes(s, [], 40)) return false;
  return !crashes(s, [0], 40) || (s.grounded && !crashes(s, [0, 18], 40));
}
