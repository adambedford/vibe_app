import { describe, expect, it } from "vitest";
import { dayIndex, init, parse, puzzleForDay, step, type Action } from "../templates/mini-crossword/src/logic.ts";
import { PUZZLES } from "../templates/mini-crossword/src/puzzles.ts";
import { loadLexicon } from "../templates/mini-crossword/tools/fill.ts";

const lex = loadLexicon();

describe("mini crossword puzzle pack", () => {
  it.each(PUZZLES.map((p) => [p.id, p] as const))("%s parses, has a clue per entry, and uses real words", (_, p) => {
    const g = parse(p);
    expect(g.entries.length).toBeGreaterThanOrEqual(8);
    for (const e of g.entries) {
      expect(e.answer.length).toBeGreaterThanOrEqual(3);
      expect(lex.level.has(e.answer.toLowerCase()), `${p.id} ${e.num}${e.dir}: ${e.answer}`).toBe(true);
      expect(e.clue.trim().length).toBeGreaterThan(2);
    }
    const answers = g.entries.map((e) => e.answer);
    expect(new Set(answers).size).toBe(answers.length);
    const declared = Object.keys(p.clues.across).length + Object.keys(p.clues.down).length;
    expect(declared, `${p.id} has clues for entries that don't exist`).toBe(g.entries.length);
  });

  it("puzzle ids are unique", () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length);
  });

  it("picks the same puzzle for everyone on a day and cycles through the pack", () => {
    expect(dayIndex("2026-01-01")).toBe(0);
    expect(dayIndex("2026-11-11")).toBe(314);
    expect(dayIndex("2028-03-01")).toBe(790);
    const seen = new Set<string>();
    for (let d = 1; d <= PUZZLES.length; d++) {
      seen.add(puzzleForDay(PUZZLES, `2026-02-${String(d).padStart(2, "0")}`).id);
    }
    expect(seen.size).toBe(PUZZLES.length);
  });
});

describe("mini crossword rules", () => {
  const g = parse(PUZZLES[0]!);

  it("solves when the solution is typed entry by entry", () => {
    let s = init(g, "p01");
    let solvedEvent = false;
    for (const e of g.entries.filter((e) => e.dir === "across")) {
      s = step(g, s, { type: "select", cell: e.cells[0]! });
      if (s.dir !== "across") s = step(g, s, { type: "toggle" });
      for (const ch of e.answer) {
        s = step(g, s, { type: "letter", ch });
        solvedEvent ||= s.events.includes("solved");
      }
    }
    expect(s.solved).toBe(true);
    expect(solvedEvent).toBe(true);
  });

  it("flags a full but wrong grid, and ignores input once solved", () => {
    let s = init(g, "p01");
    for (let i = 0; i < g.solution.length; i++) {
      if (g.blocks[i]) continue;
      s = step(g, s, { type: "select", cell: i });
      s = step(g, s, { type: "letter", ch: "Z" });
    }
    expect(s.wrong).toBe(true);
    expect(s.solved).toBe(false);
    s = step(g, s, { type: "load", fills: g.solution.slice() });
    expect(s.solved).toBe(true);
    const before = JSON.stringify(s.fills);
    s = step(g, s, { type: "letter", ch: "Q" });
    expect(JSON.stringify(s.fills)).toBe(before);
  });

  it("backspace clears the current cell, then steps back", () => {
    let s = init(g, "p01");
    const first = g.entries[0]!;
    s = step(g, s, { type: "letter", ch: "H" });
    s = step(g, s, { type: "letter", ch: "A" });
    expect(s.cursor).toBe(first.cells[2]);
    s = step(g, s, { type: "backspace" });
    expect(s.cursor).toBe(first.cells[1]);
    expect(s.fills[first.cells[1]!]).toBe("");
  });

  it("is deterministic under random input", () => {
    const run = () => {
      let a = 12345;
      const rnd = () => ((a = (a * 1103515245 + 12345) >>> 0) / 2 ** 32);
      let s = init(g, "p01");
      const types: Action["type"][] = ["select", "letter", "backspace", "toggle", "nextEntry", "prevEntry", "move"];
      for (let i = 0; i < 2000; i++) {
        const t = types[Math.floor(rnd() * types.length)]!;
        const act: Action =
          t === "select" ? { type: t, cell: Math.floor(rnd() * 25) }
          : t === "letter" ? { type: t, ch: String.fromCharCode(65 + Math.floor(rnd() * 26)) }
          : t === "move" ? { type: t, dr: Math.floor(rnd() * 3) - 1, dc: Math.floor(rnd() * 3) - 1 }
          : ({ type: t } as Action);
        s = step(g, s, act);
      }
      return JSON.stringify(s);
    };
    expect(run()).toBe(run());
  });
});
