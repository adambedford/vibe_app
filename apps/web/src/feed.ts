/**
 * The swipe feed. At most three live frames (current, next, previous); everything else
 * is a poster. Gesture model "B" from design doc 01 §5: in the feed a game runs in
 * attract mode under a tap layer and swipes scroll; a tap focuses it, which locks the
 * feed until the run ends or the player taps Next.
 */
import { loadCatalog } from "./catalog.ts";
import { prefs, track } from "./session.ts";
import { Stage } from "./stage.ts";

const LIVE_RADIUS = 1;

async function main() {
  const feed = document.getElementById("feed")!;
  const entries = await loadCatalog();
  const stages: Stage[] = [];
  let current = -1;

  const scrollTo = (i: number) => stages[i]?.el.scrollIntoView({ behavior: "smooth", block: "start" });

  for (const entry of entries) {
    const stage = new Stage({
      entry,
      mode: "feed",
      onNext: () => {
        stage.exitFocus();
        scrollTo(stages.indexOf(stage) + 1);
      },
      onFocusChange: (_s, focused) => {
        feed.classList.toggle("locked", focused);
        document.body.classList.toggle("in-focus", focused);
      },
    });
    stages.push(stage);
    feed.append(stage.el);
  }
  const end = document.createElement("section");
  end.className = "stage feed-end";
  end.innerHTML = `<div><div class="end-title">That's all for now</div><p>More games are on the way.</p></div>`;
  feed.append(end);

  function setCurrent(i: number) {
    if (i === current) return;
    const prev = stages[current];
    current = i;
    prev?.deactivate();
    stages.forEach((s, j) => {
      if (Math.abs(j - i) <= LIVE_RADIUS) s.mount(j !== i);
      else s.unmount();
    });
    stages[i]?.activate();
    feed.classList.remove("locked");
    document.body.classList.remove("in-focus");
  }

  const io = new IntersectionObserver(
    (records) => {
      for (const r of records) {
        if (r.isIntersecting && r.intersectionRatio >= 0.6) {
          const i = stages.findIndex((s) => s.el === r.target);
          if (i >= 0) setCurrent(i);
        }
      }
    },
    { root: feed, threshold: [0.6] },
  );
  stages.forEach((s) => io.observe(s.el));

  // Chrome: mute toggle, and the controls shown while a game is focused.
  const mute = document.getElementById("mute") as HTMLButtonElement;
  const renderMute = () => {
    mute.textContent = prefs.muted ? "🔇" : "🔊";
    mute.setAttribute("aria-label", prefs.muted ? "unmute" : "mute");
  };
  mute.onclick = () => {
    prefs.muted = !prefs.muted;
    renderMute();
    stages[current]?.setAudio(!prefs.muted);
    track("mute", { muted: prefs.muted });
  };
  renderMute();
  (document.getElementById("exit") as HTMLButtonElement).onclick = () => stages[current]?.exitFocus();
  (document.getElementById("next") as HTMLButtonElement).onclick = () => {
    stages[current]?.exitFocus();
    scrollTo(current + 1);
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") stages[current]?.exitFocus();
    if (stages[current]?.focused) return;
    if (e.key === "ArrowDown" || e.key === "j") scrollTo(current + 1);
    if (e.key === "ArrowUp" || e.key === "k") scrollTo(current - 1);
    if (e.key === "Enter" || e.key === " ") stages[current]?.enterFocus();
  });
  document.addEventListener("visibilitychange", () => {
    const s = stages[current];
    if (!s?.frame) return;
    if (document.hidden) s.frame.pause();
    else s.frame.resume();
  });

  (window as unknown as { __feed: object }).__feed = { stages, get current() { return current; }, setCurrent, scrollTo };
  if (stages.length) setCurrent(0);
}

main();
