/** How the checks play the mini crossword. See packages/checks/src/types.ts. */
import type { Playtest } from "@vibe/checks";
import * as L from "./src/logic.ts";
import { PUZZLES } from "./src/puzzles.ts";

interface World {
  g: L.Grid;
  s: L.State;
}

function pick(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PUZZLES[h % PUZZLES.length]!;
}

const ACTIONS: L.Action["type"][] = ["select", "letter", "letter", "letter", "backspace", "toggle", "nextEntry", "prevEntry", "move"];

export const playtest: Playtest<World, L.Action> = {
  init(seed) {
    const p = pick(seed);
    const g = L.parse(p);
    return { g, s: L.init(g, p.id) };
  },
  step(w, a) {
    w.s = L.step(w.g, w.s, a);
    return w;
  },
  status: (w) => ({ phase: w.s.solved ? "solved" : "solving", score: w.s.solved ? 1 : 0 }),
  donePhases: ["solved"],
  randomAction(w, rand) {
    const t = ACTIONS[Math.floor(rand() * ACTIONS.length)]!;
    if (t === "select") return { type: t, cell: Math.floor(rand() * w.g.solution.length) };
    if (t === "letter") return { type: t, ch: String.fromCharCode(65 + Math.floor(rand() * 26)) };
    if (t === "move") return { type: t, dr: Math.floor(rand() * 3) - 1, dc: Math.floor(rand() * 3) - 1 };
    return { type: t } as L.Action;
  },
  /** Fills the first wrong cell it finds. */
  botAction(w) {
    const i = w.g.solution.findIndex((ch, k) => !w.g.blocks[k] && w.s.fills[k] !== ch);
    if (i < 0) return null;
    if (w.s.cursor !== i) return { type: "select", cell: i };
    return { type: "letter", ch: w.g.solution[i]! };
  },
  maxActions: 600,
  /** In the browser: read the answers from the test hook and type them on the on-screen keyboard. */
  async browser(d) {
    const sol = await d.evaluate(() => (window as unknown as { __vibeTest: { solution: string[] } }).__vibeTest.solution);
    for (let i = 0; i < sol.length && !d.ended(); i++) {
      if (sol[i] === "#") continue;
      await d.click(`[data-cell="${i}"]`);
      await d.click(`[data-key="${sol[i]}"]`);
    }
    for (let k = 0; k < 30 && !d.ended(); k++) await d.wait(100);
  },
};
