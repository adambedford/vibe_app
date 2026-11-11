/**
 * Headless rule checks. The template's playtest.ts (which imports its logic) is bundled
 * and run in a VM where Date, Math.random, timers, fetch and the DOM do not exist, so any
 * impurity fails loudly. Then: determinism, a run that finishes, and simple invariants.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as esbuild from "esbuild";
import type { Playtest } from "./types.ts";

export interface CheckResult {
  name: string;
  ok: boolean;
  level: "fail" | "warn";
  detail?: string;
}

export interface LogicReport {
  results: CheckResult[];
  finishedRuns: number;
  meanScore?: number;
  stepMicros?: number;
}

const PRELUDE = `
  "use strict";
  const banned = (name) => { throw new Error(name + " is not allowed in game logic (logic must be pure; use the seeded generator)"); };
  Math.random = () => banned("Math.random");
  globalThis.Date = new Proxy(function () {}, { get: () => banned("Date"), construct: () => banned("Date"), apply: () => banned("Date") });
  globalThis.performance = undefined;
`;

function lcg(seed: number) {
  let a = seed >>> 0;
  return () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export async function loadPlaytestInVm(projectDir: string): Promise<Playtest> {
  const entry = path.join(projectDir, "playtest.ts");
  if (!existsSync(entry)) throw new Error(`${projectDir} has no playtest.ts`);
  const out = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    globalName: "__playtest",
    platform: "neutral",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  const ctx = vm.createContext({});
  vm.runInContext(PRELUDE, ctx);
  vm.runInContext(out.outputFiles[0]!.text, ctx, { filename: "playtest.bundle.js", timeout: 5000 });
  const mod = (ctx as { __playtest?: { playtest?: Playtest } }).__playtest;
  if (!mod?.playtest) throw new Error("playtest.ts must `export const playtest`");
  return mod.playtest;
}

interface RunResult {
  finished: boolean;
  score: number;
  trace: string;
  steps: number;
  scoreDecreased: boolean;
  maxStateBytes: number;
  ms: number;
}

function run(pt: Playtest, seed: string, botSeed: number, useBot: boolean): RunResult {
  const rand = lcg(botSeed);
  let s = pt.init(seed);
  let lastScore = pt.status(s).score;
  let scoreDecreased = false;
  let maxStateBytes = 0;
  let steps = 0;
  const realtime = pt.tick !== undefined;
  const limit = realtime ? (pt.maxSeconds ?? 120) * (pt.ticksPerSecond ?? 60) : (pt.maxActions ?? 5000);
  const choose = useBot && pt.botAction ? pt.botAction.bind(pt) : pt.randomAction.bind(pt);
  let h = 0x811c9dc5;
  const t0 = performance.now();
  for (let i = 0; i < limit; i++) {
    const a = choose(s, rand);
    if (a !== null) {
      s = pt.step(s, a);
      steps++;
    }
    if (realtime) {
      s = pt.step(s, pt.tick);
      steps++;
    }
    const st = pt.status(s);
    if (st.score < lastScore) scoreDecreased = true;
    lastScore = st.score;
    if (i % 60 === 0) {
      const json = JSON.stringify(s);
      maxStateBytes = Math.max(maxStateBytes, json.length);
      for (let k = 0; k < json.length; k++) h = Math.imul(h ^ json.charCodeAt(k), 0x01000193);
    }
    if (pt.donePhases.includes(st.phase)) {
      return { finished: true, score: st.score, trace: `${h >>> 0}:${JSON.stringify(s)}`, steps, scoreDecreased, maxStateBytes, ms: performance.now() - t0 };
    }
  }
  return { finished: false, score: lastScore, trace: `${h >>> 0}:${JSON.stringify(s)}`, steps, scoreDecreased, maxStateBytes, ms: performance.now() - t0 };
}

export async function checkLogic(projectDir: string): Promise<LogicReport> {
  const results: CheckResult[] = [];
  const add = (name: string, ok: boolean, detail?: string, level: "fail" | "warn" = "fail") =>
    results.push({ name, ok, level, detail });

  let pt: Playtest;
  try {
    pt = await loadPlaytestInVm(projectDir);
    add("logic.pure", true);
  } catch (e) {
    add("logic.pure", false, e instanceof Error ? e.message : String(e));
    return { results, finishedRuns: 0 };
  }

  const seeds = ["alpha", "bravo", "charlie", "delta", "echo"];
  try {
    // Determinism: same seed + same inputs => identical trajectory.
    const nondeterministic = seeds.filter((seed, i) => run(pt, seed, 100 + i, false).trace !== run(pt, seed, 100 + i, false).trace);
    add("logic.deterministic", nondeterministic.length === 0, nondeterministic.length ? `differs for seeds ${nondeterministic.join(", ")}` : undefined);

    // Fuzz with random input: no crashes, score never decreases.
    const fuzz = seeds.map((seed, i) => run(pt, seed, 900 + i, false));
    add("logic.fuzz", true, `${fuzz.reduce((a, r) => a + r.steps, 0)} random steps`);
    add("logic.score_monotonic", !fuzz.some((r) => r.scoreDecreased), fuzz.some((r) => r.scoreDecreased) ? "score went down during a run" : undefined);

    // A run can finish: endless games end when you play badly (random input); puzzles
    // end when solved (the bot). Either counts.
    const randomRuns = seeds.map((seed, i) => run(pt, seed, 300 + i, false));
    const botRuns = pt.botAction ? seeds.map((seed, i) => run(pt, seed, 500 + i, true)) : [];
    const finishedBySeed = seeds.map((_, i) => randomRuns[i]!.finished || !!botRuns[i]?.finished);
    const nFinished = finishedBySeed.filter(Boolean).length;
    add("logic.finishable", nFinished === seeds.length, `${nFinished}/${seeds.length} runs finished`);
    if (botRuns.length) {
      const mean = botRuns.reduce((a, r) => a + r.score, 0) / botRuns.length;
      add("logic.bot_scores", mean > 0, `bot mean score ${mean.toFixed(1)}`, "warn");
    }
    const plays = [...randomRuns, ...botRuns];
    const finished = plays.filter((r) => r.finished);

    const maxBytes = Math.max(...plays.map((r) => r.maxStateBytes), ...fuzz.map((r) => r.maxStateBytes));
    add("logic.state_size", maxBytes < 64 * 1024, `${maxBytes} bytes max`, "warn");

    const totalSteps = plays.reduce((a, r) => a + r.steps, 0);
    const micros = (plays.reduce((a, r) => a + r.ms, 0) * 1000) / Math.max(1, totalSteps);
    add("logic.step_speed", micros < 500, `${micros.toFixed(1)} µs/step`, "warn");
    return {
      results,
      finishedRuns: finished.length,
      meanScore: finished.length ? finished.reduce((a, r) => a + r.score, 0) / finished.length : undefined,
      stepMicros: micros,
    };
  } catch (e) {
    add("logic.fuzz", false, e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : String(e));
    return { results, finishedRuns: 0 };
  }
}
