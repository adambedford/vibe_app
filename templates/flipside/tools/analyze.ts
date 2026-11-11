/**
 * Puzzle analysis shared by the generator and the tests: which words each entry can spell,
 * how many solutions exist, and whether pure deduction (no guessing) reaches the solution.
 */
import { parse, type Puzzle } from "../src/logic.ts";

export interface Analysis {
  /** Number of complete assignments where every entry is a word (counted up to 2). */
  solutions: number;
  /** True if repeated elimination alone fixes every tile. */
  byLogic: boolean;
  /** Elimination rounds needed (a rough difficulty measure). */
  rounds: number;
  /** Words beyond the answer that entries can spell: the red herrings. */
  herrings: number;
}

/** Every dictionary word each entry's tiles can spell. */
export function wordSets(rows: string[], alts: string[], dict: Set<string>): Record<string, string[]> {
  const g = parse({ id: "x", rows, alts, start: rows.map((r) => r.replace(/[^#]/g, "0")), words: {} });
  const out: Record<string, string[]> = {};
  for (const e of g.entries) {
    const found = new Set<string>();
    const k = e.cells.length;
    for (let mask = 0; mask < 1 << k; mask++) {
      const w = e.cells.map((c, i) => g.faces[c]![(mask >> i) & 1]).join("");
      if (dict.has(w)) found.add(w);
    }
    out[e.key] = [...found].sort();
  }
  return out;
}

export function analyze(p: Puzzle): Analysis {
  const g = parse(p);
  const sets = g.entries.map((e) => new Set(e.words));
  const open = g.blocks.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0);
  const pos = new Map(open.map((c, i) => [c, i]));
  // Entries to check once their last cell (in `open` order) is assigned.
  const closesAt = open.map(() => [] as number[]);
  g.entries.forEach((e, i) => closesAt[Math.max(...e.cells.map((c) => pos.get(c)!))]!.push(i));
  const face = g.blocks.map(() => 0);
  const word = (i: number) => g.entries[i]!.cells.map((c) => g.faces[c]![face[c]!]).join("");

  let solutions = 0;
  const search = (k: number) => {
    if (solutions >= 2) return;
    if (k === open.length) {
      solutions++;
      return;
    }
    for (const f of [0, 1]) {
      face[open[k]!] = f;
      if (closesAt[k]!.every((i) => sets[i]!.has(word(i)))) search(k + 1);
    }
  };
  search(0);

  // Deduction: each tile's possible sides, narrowed by the words each entry can still spell.
  const dom: number[] = g.blocks.map((b) => (b ? 0 : 3)); // bit 1 = side 0 possible, bit 2 = side 1 possible
  let rounds = 0;
  for (let changed = true; changed; ) {
    changed = false;
    rounds++;
    g.entries.forEach((e, i) => {
      const fits = [...sets[i]!].filter((w) =>
        e.cells.every((c, j) => {
          const f = g.faces[c]!;
          return ((dom[c]! & 1) && f[0] === w[j]) || ((dom[c]! & 2) && f[1] === w[j]);
        }),
      );
      e.cells.forEach((c, j) => {
        let allowed = 0;
        for (const w of fits) allowed |= (g.faces[c]![0] === w[j] ? 1 : 0) | (g.faces[c]![1] === w[j] ? 2 : 0);
        const next = dom[c]! & allowed;
        if (next !== dom[c]) {
          dom[c] = next;
          changed = true;
        }
      });
    });
  }
  const byLogic = dom.every((d, i) => g.blocks[i] || d === 1);
  const herrings = g.entries.reduce((a, e) => a + Math.max(0, e.words.length - 1), 0);
  return { solutions, byLogic, rounds, herrings };
}
