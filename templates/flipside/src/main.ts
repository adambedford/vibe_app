/**
 * Flipside renderer and platform wiring. Rules live in logic.ts; puzzles in puzzles.ts.
 * In the feed (unfocused) it plays a demo puzzle by itself, so today's answer is never shown.
 */
import "./styles.css";
import { CONFIG } from "./config.ts";
import { botMove, cellGlow, init, parse, puzzleForDay, step, type Grid, type State } from "./logic.ts";
import { DEMO, PUZZLES } from "./puzzles.ts";

type Save = {
  day: string;
  puzzleId: string;
  face: number[];
  flips: number;
  tileFlips: number[];
  elapsedMs: number;
  solved: boolean;
  timeMs?: number;
};

const SAVE_KEY = "today";
const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const prettyDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
};

async function main() {
  vibe.loading(0.1);
  const info = await vibe.connect();
  const day = info.context.daily.day;
  const todayPuzzle = puzzleForDay(PUZZLES, day);
  const today: Grid = parse(todayPuzzle);
  const demo: Grid = parse(DEMO);

  // Today's progress
  let ts: State = init(today);
  let elapsedMs = 0;
  let timeMs: number | null = null;
  try {
    const save = (await vibe.saves.get(SAVE_KEY)) as Save | null;
    if (save && save.day === day && save.puzzleId === today.id) {
      ts = step(today, ts, { type: "load", face: save.face, flips: save.flips, tileFlips: save.tileFlips });
      elapsedMs = save.elapsedMs;
      if (save.solved) timeMs = save.timeMs ?? save.elapsedMs;
    }
  } catch {
    /* fresh start */
  }
  vibe.loading(0.6);

  const app = $("#app");
  app.innerHTML = `
    <header>
      <div class="title">${CONFIG.title}</div>
      <div class="date">${prettyDay(day)}</div>
      <div class="timer">0:00</div>
    </header>
    <div class="stats"><span class="flips"></span><span class="par"></span></div>
    <main class="board"><div class="grid" role="grid"></div></main>
    <p class="help">${CONFIG.help}</p>
    <div class="solvedbar" hidden>
      <div><div class="solved-time"></div><div class="solved-sub"></div></div>
      <button class="share">Share</button>
    </div>`;
  const gridEl = $(".grid", app);
  const timerEl = $(".timer", app);

  // Which puzzle is on screen: the demo (attract mode) or today's.
  let showing: "demo" | "today" | null = null;
  let g: Grid = demo;
  let s: State = init(demo);
  let tiles: HTMLButtonElement[] = [];

  function build(grid: Grid) {
    gridEl.style.setProperty("--n", String(grid.size));
    gridEl.replaceChildren();
    tiles = grid.faces.map(([a, b], i) => {
      const t = document.createElement("button");
      t.className = grid.blocks[i] ? "tile block" : "tile";
      if (!grid.blocks[i]) {
        t.dataset.cell = String(i);
        t.setAttribute("aria-label", `tile ${a} or ${b}`);
        const n = grid.numbers[i];
        t.innerHTML =
          `<span class="card"><span class="side s0"><b>${a}</b><i>${b}</i></span>` +
          `<span class="side s1"><b>${b}</b><i>${a}</i></span></span>` +
          (n ? `<span class="n">${n}</span>` : "");
      } else t.disabled = true;
      gridEl.append(t);
      return t;
    });
  }

  function show(which: "demo" | "today") {
    if (showing === which) return;
    showing = which;
    if (which === "demo") {
      g = demo;
      s = init(demo);
    } else {
      g = today;
      s = ts;
    }
    build(g);
    render();
  }

  function render() {
    tiles.forEach((t, i) => {
      if (g.blocks[i]) return;
      t.classList.toggle("flipped", s.face[i] === 1);
      const glow = cellGlow(g, s, i);
      t.classList.toggle("g1", glow === 1);
      t.classList.toggle("g2", glow === 2);
    });
    const isToday = showing === "today";
    $(".flips", app).textContent = isToday ? `Flips ${s.flips}` : "";
    $(".par", app).textContent = isToday ? `Par ${g.par}` : "";
    timerEl.textContent = isToday ? fmt(timeMs ?? elapsedMs) : "";
    app.classList.toggle("solved", isToday && s.solved);
    app.classList.toggle("attract", !isToday);
    $(".help", app).hidden = isToday && s.solved;
  }

  // ---------- Timer and saves ----------
  let running = false;
  let started = false;
  let lastTick = 0;
  let lastSaved = 0;
  const tick = () => {
    if (!running) return;
    const now = performance.now();
    elapsedMs += now - lastTick;
    lastTick = now;
  };
  function persist() {
    lastSaved = performance.now();
    const save: Save = {
      day,
      puzzleId: today.id,
      face: ts.face,
      flips: ts.flips,
      tileFlips: ts.tileFlips,
      elapsedMs: Math.round(elapsedMs),
      solved: ts.solved,
    };
    if (timeMs !== null) save.timeMs = timeMs;
    vibe.saves.set(SAVE_KEY, save as unknown as Parameters<typeof vibe.saves.set>[1]).catch(() => {});
  }
  setInterval(() => {
    if (!running) return;
    tick();
    timerEl.textContent = fmt(elapsedMs);
    if (performance.now() - lastSaved > 5000) persist();
  }, 250);

  function updateRunning() {
    if (vibe.focused) show("today");
    else if (!ts.solved) show("demo");
    const should = vibe.focused && !vibe.paused && !ts.solved;
    if (should && !running) {
      running = true;
      lastTick = performance.now();
      if (!started) {
        started = true;
        vibe.start();
        vibe.events.track("level_start", { puzzle: today.id });
      }
    } else if (!should && running) {
      tick();
      running = false;
      persist();
    }
    render();
  }

  // ---------- Solving ----------
  function shareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < today.size; r++) {
      let line = "";
      for (let c = 0; c < today.size; c++) {
        const i = r * today.size + c;
        if (today.blocks[i]) line += "⬛";
        else line += ts.tileFlips[i]! <= (today.startFace[i] === 1 ? 1 : 0) ? "🟩" : "🟨";
      }
      rows.push(line);
    }
    const parNote = ts.flips === today.par ? "par ⭐" : `par ${today.par}`;
    return `${CONFIG.title} · ${prettyDay(day)}\n${fmt(timeMs ?? 0)} · ${ts.flips} flips (${parNote})\n${rows.join("\n")}`;
  }

  function showSolved() {
    $(".solvedbar", app).hidden = false;
    $(".solved-time", app).textContent = `Solved in ${fmt(timeMs ?? 0)}`;
    $(".solved-sub", app).textContent =
      ts.flips === today.par ? `${ts.flips} flips · a perfect game` : `${ts.flips} flips · par ${today.par}`;
  }

  function finish() {
    tick();
    running = false;
    timeMs = Math.round(elapsedMs);
    persist();
    render();
    tiles.forEach((t, i) => (t.style.animationDelay = `${(Math.floor(i / today.size) + (i % today.size)) * 55}ms`));
    vibe.end({ outcome: "complete", score: timeMs });
    vibe.events.track("level_end", { puzzle: today.id, ms: timeMs, flips: ts.flips, par: today.par });
    vibe.scores.submit(timeMs).catch(() => {});
    vibe.scores.submit(ts.flips, { board: "flips" }).catch(() => {});
    setTimeout(showSolved, 700);
  }

  function flip(cell: number) {
    s = step(g, s, { type: "flip", cell });
    if (showing === "today") ts = s;
    const t = tiles[cell];
    if (t && s.events.includes("lit")) {
      t.classList.remove("pulse");
      void t.offsetWidth;
      t.classList.add("pulse");
    }
    render();
    if (showing === "today") {
      if (s.events.includes("solved")) finish();
      else if (performance.now() - lastSaved > 1500) persist();
    }
  }

  gridEl.addEventListener("pointerdown", (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]")?.dataset.cell;
    if (cell === undefined || !vibe.focused || vibe.paused || showing !== "today" || ts.solved) return;
    e.preventDefault();
    flip(Number(cell));
  });
  $(".share", app).addEventListener("click", () => vibe.share({ text: shareText(), score: timeMs ?? undefined }));

  // ---------- Attract mode: the demo solves itself ----------
  let demoPauseUntil = 0;
  setInterval(() => {
    if (showing !== "demo" || vibe.paused) return;
    const now = performance.now();
    if (now < demoPauseUntil) return;
    if (s.solved) {
      s = init(demo);
      render();
      demoPauseUntil = now + 900;
      return;
    }
    const wrong = s.face.map((f, i) => (f === 1 ? i : -1)).filter((i) => i >= 0);
    // Mostly right moves, with the odd wrong one so it looks like someone thinking.
    const right = s.face.map((f, i) => (f === 0 ? i : -1)).filter((i) => i >= 0);
    const pickWrong = Math.random() < 0.82 || right.length === 0;
    const pool = pickWrong ? wrong : right;
    flip(pool[Math.floor(Math.random() * pool.length)] ?? botMove(g, s) ?? 0);
    if (s.solved) demoPauseUntil = now + 2200;
  }, 650);

  // ---------- Platform lifecycle ----------
  vibe.onFocus(updateRunning);
  vibe.onPause(updateRunning);
  vibe.onResume(updateRunning);
  vibe.onRestart(() => render()); // daily: no replay

  if (info.context.mode === "test") {
    (window as unknown as { __vibeTest: object }).__vibeTest = {
      wrong: () => (showing === "today" ? ts.face.map((f, i) => (f === 1 ? i : -1)).filter((i) => i >= 0) : []),
    };
  }

  show(vibe.focused || ts.solved ? "today" : "demo");
  if (ts.solved) showSolved();
  requestAnimationFrame(() => {
    vibe.firstFrame();
    vibe.ready();
    updateRunning();
  });
}

main().catch((e) => {
  document.body.textContent = "Something went wrong loading today's puzzle.";
  throw e;
});
