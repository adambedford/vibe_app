/**
 * One game on its own page: deep links, challenge links, and the checks harness.
 *   /play.html?game=<id>[&mode=focus|feed|test][&focus=0][&challenge=<score>.<seed>]
 */
import type { FrameEvent } from "@vibe/host";
import { loadCatalog } from "./catalog.ts";
import { prefs } from "./session.ts";
import { Stage } from "./stage.ts";

async function main() {
  const q = new URLSearchParams(location.search);
  const gameId = q.get("game");
  const mode = (q.get("mode") ?? "focus") as "focus" | "feed" | "test";
  const entries = await loadCatalog();
  const entry = entries.find((e) => e.gameId === gameId);
  if (!entry) {
    document.body.innerHTML = `<p class="not-found">Game not found. <a href="/">Back to the feed</a></p>`;
    return;
  }
  let challenge: { score: number; seed: string } | undefined;
  const c = q.get("challenge")?.match(/^(-?\d+(?:\.\d+)?)\.([a-z0-9]{4,16})$/);
  if (c) challenge = { score: Number(c[1]), seed: c[2]! };

  const events: { t: number; e: FrameEvent }[] = [];
  const stage = new Stage({
    entry,
    mode,
    challenge,
    onNext: mode === "test" ? undefined : () => (location.href = "/"),
    onFrameEvent: (_s, e) => events.push({ t: Math.round(performance.now()), e }),
  });
  document.getElementById("root")!.append(stage.el);
  stage.activate();
  // focus=0 keeps the game in attract mode (the checks use it to capture the poster first).
  if (mode !== "feed" && q.get("focus") !== "0") stage.enterFocus();
  if (mode === "test") prefs.muted = true;

  // Hooks for the checks harness (packages/checks).
  (window as unknown as { __host: object }).__host = {
    stage,
    events,
    get frame() {
      return stage.frame;
    },
    pause: () => stage.frame?.pause(),
    resume: () => stage.frame?.resume(),
    focus: (on: boolean) => (on ? stage.enterFocus() : stage.exitFocus()),
    restart: () => stage.restart(),
  };
}

main();
