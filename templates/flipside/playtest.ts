/** How the checks play Flipside. See packages/checks/src/types.ts. */
import type { Playtest } from "@vibe/checks";
import * as L from "./src/logic.ts";
import { DEMO, PUZZLES } from "./src/puzzles.ts";

interface World {
  g: L.Grid;
  s: L.State;
}

const ALL = [DEMO, ...PUZZLES];

export const playtest: Playtest<World, L.Action> = {
  init(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const g = L.parse(ALL[h % ALL.length]!);
    return { g, s: L.init(g) };
  },
  step(w, a) {
    w.s = L.step(w.g, w.s, a);
    return w;
  },
  status: (w) => L.status(w.s),
  donePhases: ["solved"],
  randomAction: (w, rand) => ({ type: "flip", cell: Math.floor(rand() * w.g.blocks.length) }),
  botAction(w) {
    const cell = L.botMove(w.g, w.s);
    return cell === null ? null : { type: "flip", cell };
  },
  maxActions: 400,
  /** In the browser: ask the test hook which tiles are wrong and tap them. */
  async browser(d) {
    for (let k = 0; k < 40 && !d.ended(); k++) {
      const wrong = await d.evaluate(() => (window as unknown as { __vibeTest: { wrong(): number[] } }).__vibeTest.wrong());
      if (!wrong.length) break;
      await d.click(`[data-cell="${wrong[0]}"]`);
    }
    for (let k = 0; k < 30 && !d.ended(); k++) await d.wait(100);
  },
};
