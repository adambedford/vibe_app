/**
 * Generates Flipside puzzles: fill a grid with common words, then choose the letter on the
 * other side of each tile so that entries can spell tempting wrong words (red herrings)
 * while the puzzle keeps exactly one solution that pure deduction can reach.
 *
 *   pnpm tsx templates/flipside/tools/make.ts [count] [--seed n] [--min 8] [--max 14] [--out src/puzzles.ts]
 *
 * Without --out it prints the puzzles so you can review them first.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PATTERNS, fill, loadLexicon } from "@vibe/wordkit";
import type { Puzzle } from "../src/logic.ts";
import { analyze, wordSets } from "./analyze.ts";

/** Letters for the other side, weighted toward common ones so herrings look plausible. */
const BAG = "EEEEEAAAAIIIOOOUUNNNRRRTTTSSSLLLDDCCMMPPHHGBBYFWKV";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MakeOptions {
  seed: number;
  minHerrings: number;
  maxHerrings: number;
  iterations?: number;
}

/**
 * `answers` is the (smaller, more common) lexicon the solution is filled from; `dict` is the
 * full word list that decides which entries light up and therefore which herrings exist.
 */
export function makePuzzle(id: string, pattern: string[], dict: Set<string>, answers: ReturnType<typeof loadLexicon>, o: MakeOptions): Puzzle | null {
  const rand = rng(o.seed);
  const filled = fill(pattern, answers, { seed: o.seed });
  if (!filled) return null;
  const rows = filled.map((r) => r.toUpperCase());
  const size = rows.length;
  const sol = rows.join("");
  const open = [...sol].map((c, i) => (c === "#" ? -1 : i)).filter((i) => i >= 0);
  const pick = (not: string) => {
    for (;;) {
      const l = BAG[Math.floor(rand() * BAG.length)]!;
      if (l !== not) return l;
    }
  };
  let alt = [...sol].map((c) => (c === "#" ? "#" : pick(c)));
  const toRows = (s: string[]) => Array.from({ length: size }, (_, r) => s.slice(r * size, r * size + size).join(""));
  const zeros = rows.map((r) => r.replace(/[^#]/g, "0"));
  const evaluate = (a: string[]) => {
    const alts = toRows(a);
    const words = wordSets(rows, alts, dict);
    const p: Puzzle = { id, rows, alts, start: zeros, words };
    return { p, an: analyze(p) };
  };
  let cur = evaluate(alt);
  if (cur.an.solutions !== 1 || !cur.an.byLogic) return null;

  // Hill-climb toward more red herrings without losing uniqueness or deducibility.
  for (let it = 0; it < (o.iterations ?? 600) && cur.an.herrings < o.maxHerrings; it++) {
    const cell = open[Math.floor(rand() * open.length)]!;
    const next = alt.slice();
    next[cell] = pick(sol[cell]!);
    const cand = evaluate(next);
    if (cand.an.solutions === 1 && cand.an.byLogic && cand.an.herrings >= cur.an.herrings && cand.an.herrings <= o.maxHerrings) {
      alt = next;
      cur = cand;
    }
  }
  if (cur.an.herrings < o.minHerrings) return null;

  // Starting sides: a good share of tiles wrong, few entries already lit, not solved.
  for (let tries = 0; tries < 200; tries++) {
    const start = [...sol].map((c) => (c === "#" ? "#" : rand() < 0.55 ? "1" : "0"));
    const p: Puzzle = { ...cur.p, start: toRows(start) };
    const words = p.words;
    const lit = Object.entries(words).filter(([key]) => {
      const e = entryCells(rows, key);
      const w = e.map((c) => (start[c] === "1" ? alt[c] : sol[c])).join("");
      return words[key]!.includes(w);
    }).length;
    const par = start.filter((c) => c === "1").length;
    if (lit <= 2 && par >= Math.round(open.length * 0.45)) return p;
  }
  return null;
}

function entryCells(rows: string[], key: string): number[] {
  // Resolve an entry key ("3D") to its cells using the same numbering as the game.
  const size = rows.length;
  const flat = rows.join("");
  const open = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size && flat[r * size + c] !== "#";
  let n = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (!open(r, c)) continue;
      const a = !open(r, c - 1) && open(r, c + 1);
      const d = !open(r - 1, c) && open(r + 1, c);
      if (!a && !d) continue;
      n++;
      if (key === `${n}A`) {
        const cells = [];
        for (let cc = c; open(r, cc); cc++) cells.push(r * size + cc);
        return cells;
      }
      if (key === `${n}D`) {
        const cells = [];
        for (let rr = r; open(rr, c); rr++) cells.push(rr * size + c);
        return cells;
      }
    }
  throw new Error(`no entry ${key}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const arg = (name: string, d: number) => {
    const i = args.indexOf(name);
    return i >= 0 ? Number(args[i + 1]) : d;
  };
  const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 15);
  const outIdx = args.indexOf("--out");
  let seed = arg("--seed", 1);
  const minHerrings = arg("--min", 8);
  const maxHerrings = arg("--max", 14);
  const answers = loadLexicon([10, 20]);
  const dict = new Set([...loadLexicon([10, 20, 35]).level.keys()].map((w) => w.toUpperCase()));
  const puzzles: Puzzle[] = [];
  for (let i = 0; puzzles.length < count && i < count * 40; i++, seed++) {
    const id = `f${String(puzzles.length + 1).padStart(2, "0")}`;
    const p = makePuzzle(id, PATTERNS[i % PATTERNS.length]!, dict, answers, { seed, minHerrings, maxHerrings });
    if (!p || puzzles.some((q) => q.rows.join() === p.rows.join())) continue;
    puzzles.push(p);
    const an = analyze(p);
    const herringWords = Object.entries(p.words)
      .filter(([, ws]) => ws.length > 1)
      .map(([k, ws]) => `${k}:${ws.join("/")}`)
      .join("  ");
    console.error(`${id} seed ${seed}  herrings ${an.herrings}  rounds ${an.rounds}\n  ${p.rows.join(" ")}\n  ${herringWords}`);
  }
  if (outIdx >= 0) {
    const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", args[outIdx + 1]!);
    const [demo, ...daily] = puzzles;
    const body =
      `import type { Puzzle } from "./logic.ts";\n\n` +
      `/** Generated by tools/make.ts. Review the words before publishing. */\n` +
      `export const DEMO: Puzzle = ${JSON.stringify(demo, null, 2)};\n\n` +
      `export const PUZZLES: Puzzle[] = ${JSON.stringify(daily, null, 2)};\n`;
    writeFileSync(out, body);
    console.error(`wrote ${daily.length} daily puzzles + 1 demo to ${out}`);
  }
}
