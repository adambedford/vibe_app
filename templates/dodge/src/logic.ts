/**
 * Dodge rules. Pure and deterministic: state + action -> state. No clock, DOM, network,
 * Math.random or engine calls. The renderer steps this at 60 ticks a second.
 */
import { CONFIG as C } from "./config.ts";

export const W = 360;
export const H = 640;
export const PLAYER_Y = 560;
export const PLAYER_R = 18;
export const TICK_MS = 1000 / 60;

export interface Obj {
  id: number;
  kind: "rock" | "star";
  x: number;
  y: number;
  r: number;
  vy: number;
}

export type DodgeEvent = "start" | "spawn" | "star" | "die";

export interface State {
  tick: number;
  rng: number;
  phase: "ready" | "play" | "over";
  x: number;
  targetX: number;
  objs: Obj[];
  nextId: number;
  untilSpawn: number;
  stars: number;
  score: number;
  events: DodgeEvent[];
}

export type Action = { type: "tick" } | { type: "point"; x: number };

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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function init(seed: string): State {
  return {
    tick: 0,
    rng: hash(seed),
    phase: "ready",
    x: W / 2,
    targetX: W / 2,
    objs: [],
    nextId: 1,
    untilSpawn: 20,
    stars: 0,
    score: 0,
    events: [],
  };
}

export function status(s: State) {
  return { phase: s.phase, score: s.score };
}

export function difficulty(s: State): number {
  return Math.min(1, s.tick / (60 * C.rampSeconds));
}

export function step(s: State, a: Action): State {
  s.events = [];
  if (a.type === "point") {
    if (s.phase === "over") return s;
    s.targetX = clamp(a.x, PLAYER_R, W - PLAYER_R);
    if (s.phase === "ready") {
      s.phase = "play";
      s.events.push("start");
    }
    return s;
  }
  if (s.phase !== "play") return s;
  s.tick++;

  const dx = s.targetX - s.x;
  s.x += clamp(dx, -C.playerSpeed, C.playerSpeed);

  const d = difficulty(s);
  const speedMul = 1 + d * C.speedRamp;
  for (const o of s.objs) o.y += o.vy * speedMul;
  s.objs = s.objs.filter((o) => o.y - o.r < H + 10);

  if (--s.untilSpawn <= 0) {
    const star = rand(s) < C.starChance;
    const r = star ? 13 : C.rockRadius[0] + rand(s) * (C.rockRadius[1] - C.rockRadius[0]);
    s.objs.push({
      id: s.nextId++,
      kind: star ? "star" : "rock",
      x: r + rand(s) * (W - 2 * r),
      y: -r,
      r,
      vy: C.fallSpeed[0] + rand(s) * (C.fallSpeed[1] - C.fallSpeed[0]),
    });
    s.untilSpawn = Math.round(C.spawnStart + (C.spawnEnd - C.spawnStart) * d);
    s.events.push("spawn");
  }

  for (const o of s.objs) {
    const hit = Math.hypot(o.x - s.x, o.y - PLAYER_Y) < o.r + PLAYER_R * (o.kind === "rock" ? 0.75 : 1.1);
    if (!hit) continue;
    if (o.kind === "star") {
      s.stars++;
      o.y = H + 100; // removed next tick
      s.events.push("star");
    } else {
      s.phase = "over";
      s.events.push("die");
      break;
    }
  }
  s.score = Math.floor(s.tick / 60) + s.stars * C.starValue;
  return s;
}

/** Bot: steer to the x with the least nearby danger, drifting toward stars. */
export function botTarget(s: State): number {
  let bestX = s.x;
  let bestCost = Infinity;
  for (let x = PLAYER_R; x <= W - PLAYER_R; x += 12) {
    let cost = Math.abs(x - s.x) * 0.02;
    for (const o of s.objs) {
      if (o.y < PLAYER_Y - 300 || o.y > PLAYER_Y + 30) continue;
      const near = 1 - (PLAYER_Y - o.y) / 330;
      const gap = Math.abs(x - o.x) - (o.r + PLAYER_R + 10);
      if (o.kind === "rock" && gap < 0) cost += (-gap + 20) * near * 4;
      if (o.kind === "star" && gap < 20) cost -= 25 * near;
    }
    if (cost < bestCost) {
      bestCost = cost;
      bestX = x;
    }
  }
  return bestX;
}
