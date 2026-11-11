/**
 * Shared word tools for word-game templates: a lexicon of common English words (SCOWL
 * levels via wordlist-english), grid slot finding, and a backtracking grid filler.
 * Templates call these from their offline tools (never at runtime in the game).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Block patterns: "#" is a block. Every entry is 3+ letters. */
export const PATTERNS: string[][] = [
  ["#....", ".....", ".....", ".....", "....#"],
  ["....#", ".....", ".....", ".....", "#...."],
  ["##...", "#....", ".....", "....#", "...##"],
  ["...##", "....#", ".....", "#....", "##..."],
  ["#...#", ".....", ".....", ".....", "#...#"],
];

/** Words never used in fills: offensive, sexual, drug, or otherwise off-tone for a daily puzzle. */
const BLOCKLIST = new Set(
  (
    "anal anus arse ass asses bitch boob boobs butt cock coke crap cum damn dick dyke fag fags fart gay gays god gods " +
    "hell homo jap kike kill nazi negro nude nudes orgy penis piss porn pot rape raped sex sexy shit slut spic tit tits " +
    "twat whore wank weed dope drug drugs bong crack meth heroin opium gun guns knife stab dead death die died dies " +
    "suicide jew jews arab arabs paki chink gook wop dago homo lesbo queer slave slaves kkk isis"
  ).split(/\s+/),
);

export interface Lexicon {
  level: Map<string, number>;
  byLength: Map<number, string[]>;
}

export function loadLexicon(levels = [10, 20, 35]): Lexicon {
  const lists = require("wordlist-english") as Record<string, string[]>;
  const level = new Map<string, number>();
  for (const l of levels) {
    for (const w of lists[`english/${l}`] ?? []) {
      if (!/^[a-z]{3,5}$/.test(w) || BLOCKLIST.has(w) || level.has(w)) continue;
      level.set(w, l);
    }
  }
  const byLength = new Map<number, string[]>();
  for (const w of level.keys()) {
    const arr = byLength.get(w.length) ?? [];
    arr.push(w);
    byLength.set(w.length, arr);
  }
  return { level, byLength };
}

export interface Slot {
  cells: number[];
  dir: "across" | "down";
}

export function slots(pattern: string[]): Slot[] {
  const n = pattern.length;
  const open = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && pattern[r]![c] !== "#";
  const out: Slot[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!open(r, c)) continue;
      if (!open(r, c - 1) && open(r, c + 1)) {
        const cells = [];
        for (let cc = c; open(r, cc); cc++) cells.push(r * n + cc);
        out.push({ cells, dir: "across" });
      }
      if (!open(r - 1, c) && open(r + 1, c)) {
        const cells = [];
        for (let rr = r; open(rr, c); rr++) cells.push(rr * n + c);
        out.push({ cells, dir: "down" });
      }
    }
  return out;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fill(
  pattern: string[],
  lex: Lexicon,
  opts: { seed: number; theme?: Set<string>; maxNodes?: number },
): string[] | null {
  const n = pattern.length;
  const ss = slots(pattern);
  const letters: string[] = pattern.join("").split("").map((c) => (c === "#" ? "#" : ""));
  const used = new Set<string>();
  const rand = rng(opts.seed);
  const prefer = (w: string) => (opts.theme?.has(w) ? 0 : 1) * 100 + lex.level.get(w)! + rand() * 30;
  let nodes = 0;
  const maxNodes = opts.maxNodes ?? 200_000;

  const candidates = (s: Slot) => {
    const pat = s.cells.map((c) => letters[c]);
    return (lex.byLength.get(s.cells.length) ?? []).filter(
      (w) => !used.has(w) && pat.every((ch, i) => ch === "" || ch === w[i]),
    );
  };

  const solve = (): boolean => {
    if (++nodes > maxNodes) return false;
    let best: Slot | null = null;
    let bestCands: string[] = [];
    for (const s of ss) {
      if (s.cells.every((c) => letters[c] !== "")) continue;
      const cands = candidates(s);
      if (cands.length === 0) return false;
      if (!best || cands.length < bestCands.length) {
        best = s;
        bestCands = cands;
      }
    }
    if (!best) {
      // Every slot is full; make sure every crossing word is a real, unused word.
      const words = ss.map((s) => s.cells.map((c) => letters[c]).join(""));
      return new Set(words).size === words.length && words.every((w) => lex.level.has(w));
    }
    const ranked = bestCands.map((w) => [prefer(w), w] as const).sort((a, b) => a[0] - b[0]);
    for (const [, w] of ranked.slice(0, 40)) {
      const prev = best.cells.map((c) => letters[c]!);
      best.cells.forEach((c, i) => (letters[c] = w[i]!));
      used.add(w);
      if (solve()) return true;
      used.delete(w);
      best.cells.forEach((c, i) => (letters[c] = prev[i]!));
    }
    return false;
  };

  if (!solve()) return null;
  const rows: string[] = [];
  for (let r = 0; r < n; r++) rows.push(letters.slice(r * n, r * n + n).join("").toUpperCase());
  return rows;
}

