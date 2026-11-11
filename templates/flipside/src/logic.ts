/**
 * Flipside rules. Every tile has a letter on each side; tap to flip it. The puzzle is solved
 * when every across and down entry is a word. Generated puzzles have exactly one solution,
 * reachable by reasoning alone (tools/make.ts checks both).
 *
 * Pure: state + action -> state. No clock, DOM, network or randomness.
 */

export interface Puzzle {
  id: string;
  /** Solution letters, one string per row, "#" for blocks. */
  rows: string[];
  /** The letter on the other side of each tile. */
  alts: string[];
  /** Starting side per tile: "0" shows the solution letter, "1" the other letter. */
  start: string[];
  /** For each entry ("1A", "3D"...), every word its tiles can spell. Lights entries without shipping a dictionary. */
  words: Record<string, string[]>;
}

export type Dir = "across" | "down";

export interface Entry {
  key: string;
  num: number;
  dir: Dir;
  cells: number[];
  words: string[];
}

export interface Grid {
  id: string;
  size: number;
  blocks: boolean[];
  /** [solution letter, other letter] per cell; ["#", "#"] for blocks. */
  faces: [string, string][];
  numbers: (number | null)[];
  entries: Entry[];
  /** Indexes into `entries` for each cell. */
  cellEntries: number[][];
  startFace: number[];
  /** Fewest flips that solve the puzzle from the start. */
  par: number;
}

export type FlipEvent = "flip" | "lit" | "unlit" | "solved";

export interface State {
  puzzleId: string;
  /** 0 or 1 per cell (which side is up); -1 for blocks. */
  face: number[];
  flips: number;
  tileFlips: number[];
  valid: boolean[];
  solved: boolean;
  events: FlipEvent[];
}

export type Action =
  | { type: "flip"; cell: number }
  | { type: "load"; face: number[]; flips: number; tileFlips: number[] };

export function parse(p: Puzzle): Grid {
  const size = p.rows.length;
  const flat = p.rows.join("");
  const alt = p.alts.join("");
  const start = p.start.join("");
  if (flat.length !== size * size || alt.length !== flat.length || start.length !== flat.length) {
    throw new Error(`${p.id}: rows, alts and start must be the same square size`);
  }
  const blocks = [...flat].map((c) => c === "#");
  const faces = blocks.map((b, i) => (b ? ["#", "#"] : [flat[i]!.toUpperCase(), alt[i]!.toUpperCase()]) as [string, string]);
  const open = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size && !blocks[r * size + c];
  const numbers: (number | null)[] = new Array(size * size).fill(null);
  const found: Omit<Entry, "words">[] = [];
  let n = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!open(r, c)) continue;
      const a = !open(r, c - 1) && open(r, c + 1);
      const d = !open(r - 1, c) && open(r + 1, c);
      if (!a && !d) continue;
      numbers[r * size + c] = ++n;
      if (a) {
        const cells = [];
        for (let cc = c; open(r, cc); cc++) cells.push(r * size + cc);
        found.push({ key: `${n}A`, num: n, dir: "across", cells });
      }
      if (d) {
        const cells = [];
        for (let rr = r; open(rr, c); rr++) cells.push(rr * size + c);
        found.push({ key: `${n}D`, num: n, dir: "down", cells });
      }
    }
  }
  const entries: Entry[] = found
    .sort((x, y) => (x.dir === y.dir ? x.num - y.num : x.dir === "across" ? -1 : 1))
    .map((e) => ({ ...e, words: (p.words[e.key] ?? []).map((w) => w.toUpperCase()) }));
  const cellEntries = blocks.map(() => [] as number[]);
  entries.forEach((e, i) => e.cells.forEach((c) => cellEntries[c]!.push(i)));
  const startFace = blocks.map((b, i) => (b ? -1 : start[i] === "1" ? 1 : 0));
  return {
    id: p.id,
    size,
    blocks,
    faces,
    numbers,
    entries,
    cellEntries,
    startFace,
    par: startFace.filter((f) => f === 1).length,
  };
}

export function letter(g: Grid, s: State, cell: number): string {
  return g.faces[cell]![s.face[cell]!] ?? "#";
}

export function entryWord(g: Grid, s: State, e: Entry): string {
  return e.cells.map((c) => letter(g, s, c)).join("");
}

function evaluate(g: Grid, s: State): boolean[] {
  return g.entries.map((e) => e.words.includes(entryWord(g, s, e)));
}

export function init(g: Grid): State {
  const s: State = {
    puzzleId: g.id,
    face: g.startFace.slice(),
    flips: 0,
    tileFlips: g.blocks.map(() => 0),
    valid: [],
    solved: false,
    events: [],
  };
  s.valid = evaluate(g, s);
  s.solved = s.valid.every(Boolean);
  return s;
}

export function step(g: Grid, s: State, a: Action): State {
  s.events = [];
  if (a.type === "load") {
    if (a.face.length === s.face.length && a.face.every((f, i) => (g.blocks[i] ? f === -1 : f === 0 || f === 1))) {
      s.face = a.face.slice();
      s.flips = Math.max(0, Math.floor(a.flips));
      s.tileFlips = a.tileFlips.length === s.face.length ? a.tileFlips.slice() : s.tileFlips;
      s.valid = evaluate(g, s);
      s.solved = s.valid.every(Boolean);
    }
    return s;
  }
  if (s.solved || a.cell < 0 || a.cell >= s.face.length || g.blocks[a.cell]) return s;
  s.face[a.cell] = 1 - s.face[a.cell]!;
  s.flips++;
  s.tileFlips[a.cell]!++;
  s.events.push("flip");
  const before = s.valid;
  s.valid = evaluate(g, s);
  if (s.valid.some((v, i) => v && !before[i])) s.events.push("lit");
  if (s.valid.some((v, i) => !v && before[i])) s.events.push("unlit");
  if (s.valid.every(Boolean)) {
    s.solved = true;
    s.events.push("solved");
  }
  return s;
}

export function status(s: State) {
  return { phase: s.solved ? "solved" : "solving", score: s.flips };
}

/** How lit a cell is: 0 none of its entries are words, 1 some, 2 all. */
export function cellGlow(g: Grid, s: State, cell: number): 0 | 1 | 2 {
  const es = g.cellEntries[cell]!;
  const lit = es.filter((i) => s.valid[i]).length;
  return lit === 0 ? 0 : lit === es.length ? 2 : 1;
}

/** Bot: flip a tile that is on its wrong side (face 1). Used by attract mode and the checks. */
export function botMove(g: Grid, s: State): number | null {
  const i = s.face.findIndex((f, k) => !g.blocks[k] && f === 1);
  return i < 0 ? null : i;
}

/** Days since 2026-01-01 for a YYYY-MM-DD string (no Date: logic stays clock-free). */
export function dayIndex(day: string): number {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return daysFromCivil(y, m, d) - daysFromCivil(2026, 1, 1);
}

function daysFromCivil(y: number, m: number, d: number): number {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function puzzleForDay<T>(puzzles: T[], day: string): T {
  const i = dayIndex(day);
  return puzzles[((i % puzzles.length) + puzzles.length) % puzzles.length]!;
}
