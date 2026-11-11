/** How the checks play Dodge. See packages/checks/src/types.ts. */
import type { Playtest } from "@vibe/checks";
import * as L from "./src/logic.ts";

export const playtest: Playtest<L.State, L.Action> = {
  init: L.init,
  step: L.step,
  status: L.status,
  donePhases: ["over"],
  tick: { type: "tick" },
  ticksPerSecond: 60,
  randomAction: (_s, rand) => (rand() < 0.1 ? { type: "point", x: rand() * L.W } : null),
  botAction: (s) => (s.phase === "ready" || s.tick % 4 === 0 ? { type: "point", x: L.botTarget(s) } : null),
  maxSeconds: 120,
};
