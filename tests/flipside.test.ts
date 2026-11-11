import { describe, expect, it } from "vitest";
import { loadLexicon } from "@vibe/wordkit";
import { botMove, init, parse, step } from "../templates/flipside/src/logic.ts";
import { DEMO, PUZZLES } from "../templates/flipside/src/puzzles.ts";
import { analyze, wordSets } from "../templates/flipside/tools/analyze.ts";

const dict = new Set([...loadLexicon([10, 20, 35]).level.keys()].map((w) => w.toUpperCase()));
const answers = new Set([...loadLexicon([10, 20]).level.keys()].map((w) => w.toUpperCase()));
const ALL = [DEMO, ...PUZZLES];

describe("Flipside puzzle pack", () => {
  it.each(ALL.map((p) => [p.id, p] as const))("%s: one solution, solvable by deduction, common answers", (_, p) => {
    const an = analyze(p);
    expect(an.solutions).toBe(1);
    expect(an.byLogic).toBe(true);
    expect(an.herrings).toBeGreaterThanOrEqual(6);
    const g = parse(p);
    for (const e of g.entries) {
      const answer = e.cells.map((c) => g.faces[c]![0]).join("");
      expect(answers.has(answer), `${p.id} ${e.key}: ${answer}`).toBe(true);
      expect(e.words).toContain(answer);
      expect(g.faces.every(([a, b], i) => g.blocks[i] || a !== b)).toBe(true);
    }
    // The shipped word lists are exactly what the tiles can spell (so lighting is honest).
    expect(p.words).toEqual(wordSets(p.rows, p.alts, dict));
  });

  it("starts unsolved with a sensible par", () => {
    for (const p of ALL) {
      const g = parse(p);
      const s = init(g);
      expect(s.solved, p.id).toBe(false);
      expect(g.par, p.id).toBeGreaterThanOrEqual(8);
      expect(s.valid.filter(Boolean).length, p.id).toBeLessThanOrEqual(2);
    }
  });

  it("has unique grids", () => {
    expect(new Set(ALL.map((p) => p.rows.join())).size).toBe(ALL.length);
  });
});

describe("Flipside rules", () => {
  const g = parse(PUZZLES[0]!);

  it("the bot solves in exactly par flips", () => {
    let s = init(g);
    for (let cell = botMove(g, s); cell !== null; cell = botMove(g, s)) s = step(g, s, { type: "flip", cell });
    expect(s.solved).toBe(true);
    expect(s.flips).toBe(g.par);
  });

  it("flipping twice undoes a flip and counts both", () => {
    let s = init(g);
    const cell = g.blocks.findIndex((b) => !b);
    const before = s.face[cell];
    s = step(g, s, { type: "flip", cell });
    s = step(g, s, { type: "flip", cell });
    expect(s.face[cell]).toBe(before);
    expect(s.flips).toBe(2);
    expect(s.tileFlips[cell]).toBe(2);
  });

  it("ignores blocks and input after solving", () => {
    let s = init(g);
    const block = g.blocks.findIndex((b) => b);
    if (block >= 0) expect(step(g, s, { type: "flip", cell: block }).flips).toBe(0);
    s = step(g, s, { type: "load", face: g.blocks.map((b) => (b ? -1 : 0)), flips: 9, tileFlips: g.blocks.map(() => 0) });
    expect(s.solved).toBe(true);
    expect(step(g, s, { type: "flip", cell: g.blocks.findIndex((b) => !b) }).flips).toBe(9);
  });
});
