/**
 * Mini crossword rules. Pure: state + action -> state, no clock, DOM, network or randomness.
 * The renderer (main.ts) draws the state; the checks run this module headless.
 */

export interface Puzzle {
  id: string;
  /** One string per row. Letters are the solution, "#" is a block. */
  rows: string[];
  clues: { across: Record<string, string>; down: Record<string, string> };
}

export type Dir = "across" | "down";

export interface Entry {
  num: number;
  dir: Dir;
  cells: number[];
  answer: string;
  clue: string;
}

export interface Grid {
  size: number;
  blocks: boolean[];
  solution: string[];
  numbers: (number | null)[];
  entries: Entry[];
  /** For each cell, the index into `entries` of its across and down entry (or -1). */
  cellEntries: { across: number; down: number }[];
}

export interface State {
  puzzleId: string;
  fills: string[];
  cursor: number;
  dir: Dir;
  solved: boolean;
  /** All cells filled but something is wrong. */
  wrong: boolean;
  /** Effects for the renderer, cleared at the start of every step. */
  events: ("typed" | "moved" | "solved" | "wrong" | "cleared")[];
}

export type Action =
  | { type: "select"; cell: number }
  | { type: "letter"; ch: string }
  | { type: "backspace" }
  | { type: "toggle" }
  | { type: "nextEntry" }
  | { type: "prevEntry" }
  | { type: "move"; dr: number; dc: number }
  | { type: "load"; fills: string[] };

export function parse(p: Puzzle): Grid {
  const size = p.rows.length;
  if (!p.rows.every((r) => r.length === size)) throw new Error(`${p.id}: grid must be square`);
  const flat = p.rows.join("");
  const blocks = [...flat].map((c) => c === "#");
  const solution = [...flat].map((c) => (c === "#" ? "#" : c.toUpperCase()));
  const numbers: (number | null)[] = new Array(size * size).fill(null);
  const entries: Entry[] = [];
  const cellEntries = blocks.map(() => ({ across: -1, down: -1 }));
  const open = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size && !blocks[r * size + c];
  let n = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!open(r, c)) continue;
      const startsAcross = !open(r, c - 1) && open(r, c + 1);
      const startsDown = !open(r - 1, c) && open(r + 1, c);
      if (!startsAcross && !startsDown) continue;
      n++;
      numbers[r * size + c] = n;
      for (const dir of ["across", "down"] as const) {
        if ((dir === "across" && !startsAcross) || (dir === "down" && !startsDown)) continue;
        const cells: number[] = [];
        let rr = r;
        let cc = c;
        while (open(rr, cc)) {
          cells.push(rr * size + cc);
          if (dir === "across") cc++;
          else rr++;
        }
        const clue = p.clues[dir][String(n)];
        if (clue === undefined) throw new Error(`${p.id}: missing clue ${n} ${dir}`);
        const idx = entries.push({ num: n, dir, cells, answer: cells.map((i) => solution[i]).join(""), clue }) - 1;
        for (const cell of cells) cellEntries[cell]![dir] = idx;
      }
    }
  }
  // Order: all across entries, then all down entries.
  const order = [...entries].sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === "across" ? -1 : 1));
  const remap = new Map(order.map((e, i) => [entries.indexOf(e), i]));
  for (const ce of cellEntries) {
    ce.across = ce.across < 0 ? -1 : remap.get(ce.across)!;
    ce.down = ce.down < 0 ? -1 : remap.get(ce.down)!;
  }
  return { size, blocks, solution, numbers, entries: order, cellEntries };
}

/** Days since 2026-01-01 for a YYYY-MM-DD string (no Date: logic stays clock-free). */
export function dayIndex(day: string): number {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return daysFromCivil(y, m, d) - daysFromCivil(2026, 1, 1);
}

/** Howard Hinnant's days_from_civil: days since 1970-01-01 in the proleptic Gregorian calendar. */
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

export function init(g: Grid, puzzleId: string): State {
  const first = g.entries[0]!;
  return {
    puzzleId,
    fills: g.blocks.map((b) => (b ? "#" : "")),
    cursor: first.cells[0]!,
    dir: first.dir,
    solved: false,
    wrong: false,
    events: [],
  };
}

export function currentEntry(g: Grid, s: State): Entry {
  const ce = g.cellEntries[s.cursor]!;
  const idx = ce[s.dir] >= 0 ? ce[s.dir] : ce[s.dir === "across" ? "down" : "across"];
  return g.entries[idx]!;
}

function entryIndex(g: Grid, s: State): number {
  return g.entries.indexOf(currentEntry(g, s));
}

function goToEntry(g: Grid, s: State, idx: number) {
  const e = g.entries[(idx + g.entries.length) % g.entries.length]!;
  s.dir = e.dir;
  s.cursor = e.cells.find((c) => s.fills[c] === "") ?? e.cells[0]!;
}

function evaluate(g: Grid, s: State) {
  const full = g.blocks.every((b, i) => b || s.fills[i] !== "");
  if (!full) {
    s.wrong = false;
    return;
  }
  const right = g.solution.every((ch, i) => s.fills[i] === ch);
  if (right) {
    s.solved = true;
    s.wrong = false;
    s.events.push("solved");
  } else if (!s.wrong) {
    s.wrong = true;
    s.events.push("wrong");
  }
}

export function step(g: Grid, s: State, a: Action): State {
  s.events = [];
  if (s.solved && a.type !== "load") return s;
  switch (a.type) {
    case "load": {
      if (a.fills.length === s.fills.length) {
        s.fills = a.fills.map((f, i) => (g.blocks[i] ? "#" : /^[A-Z]$/.test(f) ? f : ""));
        s.solved = g.solution.every((ch, i) => s.fills[i] === ch);
      }
      return s;
    }
    case "select": {
      if (a.cell < 0 || a.cell >= s.fills.length || g.blocks[a.cell]) return s;
      if (a.cell === s.cursor) {
        const other = s.dir === "across" ? "down" : "across";
        if (g.cellEntries[a.cell]![other] >= 0) s.dir = other;
      } else {
        s.cursor = a.cell;
        if (g.cellEntries[a.cell]![s.dir] < 0) s.dir = s.dir === "across" ? "down" : "across";
      }
      s.events.push("moved");
      return s;
    }
    case "toggle": {
      const other = s.dir === "across" ? "down" : "across";
      if (g.cellEntries[s.cursor]![other] >= 0) s.dir = other;
      s.events.push("moved");
      return s;
    }
    case "move": {
      const r = Math.floor(s.cursor / g.size) + a.dr;
      const c = (s.cursor % g.size) + a.dc;
      if (r >= 0 && c >= 0 && r < g.size && c < g.size && !g.blocks[r * g.size + c]) {
        s.cursor = r * g.size + c;
        if (g.cellEntries[s.cursor]![s.dir] < 0) s.dir = s.dir === "across" ? "down" : "across";
        s.events.push("moved");
      }
      return s;
    }
    case "nextEntry":
      goToEntry(g, s, entryIndex(g, s) + 1);
      s.events.push("moved");
      return s;
    case "prevEntry":
      goToEntry(g, s, entryIndex(g, s) - 1);
      s.events.push("moved");
      return s;
    case "letter": {
      const ch = a.ch.toUpperCase();
      if (!/^[A-Z]$/.test(ch)) return s;
      s.fills[s.cursor] = ch;
      s.events.push("typed");
      const e = currentEntry(g, s);
      const pos = e.cells.indexOf(s.cursor);
      // Next empty cell later in this entry, then earlier in it, then the next entry.
      const after = e.cells.slice(pos + 1).find((c) => s.fills[c] === "");
      const before = e.cells.slice(0, pos).find((c) => s.fills[c] === "");
      if (after !== undefined) s.cursor = after;
      else if (before !== undefined) s.cursor = before;
      else {
        const start = g.entries.indexOf(e);
        let moved = false;
        for (let k = 1; k <= g.entries.length; k++) {
          const next = g.entries[(start + k) % g.entries.length]!;
          const empty = next.cells.find((c) => s.fills[c] === "");
          if (empty !== undefined) {
            s.dir = next.dir;
            s.cursor = empty;
            moved = true;
            break;
          }
        }
        if (!moved && pos < e.cells.length - 1) s.cursor = e.cells[pos + 1]!;
      }
      evaluate(g, s);
      return s;
    }
    case "backspace": {
      const e = currentEntry(g, s);
      const pos = e.cells.indexOf(s.cursor);
      if (s.fills[s.cursor] !== "") {
        s.fills[s.cursor] = "";
      } else if (pos > 0) {
        s.cursor = e.cells[pos - 1]!;
        s.fills[s.cursor] = "";
      }
      s.wrong = false;
      s.events.push("cleared");
      return s;
    }
  }
}
