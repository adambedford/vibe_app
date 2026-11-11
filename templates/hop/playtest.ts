/** How the checks play Hop. See packages/checks/src/types.ts. */
import type { Playtest } from "@vibe/checks";
import * as L from "./src/logic.ts";

export const playtest: Playtest<L.State, L.Action> = {
  init: L.init,
  step: L.step,
  status: L.status,
  donePhases: ["over"],
  tick: { type: "tick" },
  ticksPerSecond: 60,
  randomAction: (_s, rand) => (rand() < 0.04 ? { type: "tap" } : null),
  botAction: (s) => (L.botShouldTap(s) ? { type: "tap" } : null),
  maxSeconds: 120,
};
