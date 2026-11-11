/**
 * Daily mini crossword: renderer and platform wiring. Rules live in logic.ts.
 * Plain DOM, no engine. An on-screen keyboard avoids the phone's own keyboard,
 * which would resize the page and fight with the feed.
 */
import "./styles.css";
import { CONFIG } from "./config.ts";
import { currentEntry, init, parse, puzzleForDay, step, type Action, type Grid, type State } from "./logic.ts";
import { PUZZLES } from "./puzzles.ts";

type Save = {
  day: string;
  puzzleId: string;
  fills: string[];
  elapsedMs: number;
  solved: boolean;
  timeMs?: number;
};

const SAVE_KEY = "today";
const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function prettyDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

async function main() {
  vibe.loading(0.1);
  const info = await vibe.connect();
  const day = info.context.daily.day;
  const puzzle = puzzleForDay(PUZZLES, day);
  const grid: Grid = parse(puzzle);
  let state: State = init(grid, puzzle.id);
  let elapsedMs = 0;
  let timeMs: number | null = null;
  let running = false;
  let started = false;
  let lastTick = 0;

  try {
    const save = (await vibe.saves.get(SAVE_KEY)) as Save | null;
    if (save && save.day === day && save.puzzleId === puzzle.id) {
      state = step(grid, state, { type: "load", fills: save.fills });
      elapsedMs = save.elapsedMs;
      if (save.solved) timeMs = save.timeMs ?? save.elapsedMs;
    }
  } catch {
    /* no saved progress; start fresh */
  }
  vibe.loading(0.6);

  // ---------- DOM ----------
  const app = $("#app");
  app.innerHTML = `
    <header>
      <div class="title">${CONFIG.title}</div>
      <div class="date">${prettyDay(day)}</div>
      <div class="timer" aria-label="time">0:00</div>
    </header>
    <main class="board"><div class="grid" role="grid" style="--n:${grid.size}"></div></main>
    <div class="cluebar">
      <button class="nav prev" aria-label="previous clue">‹</button>
      <button class="clue"><span class="num"></span><span class="text"></span></button>
      <button class="nav next" aria-label="next clue">›</button>
    </div>
    <div class="keyboard"></div>
    <div class="solvedbar" hidden>
      <div><div class="solved-time"></div><div class="solved-next"></div></div>
      <button class="share">Share</button>
    </div>
    <div class="toast" role="status"></div>`;

  const gridEl = $(".grid", app);
  const cells: HTMLDivElement[] = grid.blocks.map((block, i) => {
    const el = document.createElement("div");
    el.className = block ? "cell block" : "cell";
    el.setAttribute("role", "gridcell");
    if (!block) {
      el.dataset.cell = String(i);
      const n = grid.numbers[i];
      el.innerHTML = `${n ? `<span class="n">${n}</span>` : ""}<span class="ch"></span>`;
    }
    gridEl.append(el);
    return el;
  });

  const kb = $(".keyboard", app);
  for (const row of ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM⌫"]) {
    const r = document.createElement("div");
    r.className = "krow";
    for (const k of row) {
      const b = document.createElement("button");
      b.className = k === "⌫" ? "key wide" : "key";
      b.textContent = k;
      b.dataset.key = k === "⌫" ? "Backspace" : k;
      b.setAttribute("aria-label", k === "⌫" ? "delete" : k);
      r.append(b);
    }
    kb.append(r);
  }

  const timerEl = $(".timer", app);
  const toastEl = $(".toast", app);

  // ---------- Render ----------
  function render() {
    const entry = currentEntry(grid, state);
    const inEntry = new Set(entry.cells);
    cells.forEach((el, i) => {
      if (grid.blocks[i]) return;
      el.classList.toggle("in-entry", inEntry.has(i) && !state.solved);
      el.classList.toggle("cursor", i === state.cursor && !state.solved);
      (el.lastElementChild as HTMLElement).textContent = state.fills[i] ?? "";
    });
    $(".num", app).textContent = `${entry.num}${entry.dir === "across" ? "A" : "D"}`;
    $(".text", app).textContent = entry.clue;
    timerEl.textContent = fmtTime(timeMs ?? elapsedMs);
    app.classList.toggle("solved", state.solved);
    app.classList.toggle("attract", !vibe.focused && !state.solved);
  }

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  function toast(text: string) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  // ---------- Timer and saves ----------
  function tick() {
    if (!running) return;
    const now = performance.now();
    elapsedMs += now - lastTick;
    lastTick = now;
  }

  function updateRunning() {
    const should = vibe.focused && !vibe.paused && !state.solved;
    if (should && !running) {
      running = true;
      lastTick = performance.now();
      if (!started) {
        started = true;
        vibe.start();
        vibe.events.track("level_start", { puzzle: puzzle.id });
      }
    } else if (!should && running) {
      tick();
      running = false;
      persist();
    }
    render();
  }

  let lastSaved = 0;
  function persist() {
    lastSaved = performance.now();
    const save: Save = { day, puzzleId: puzzle.id, fills: state.fills, elapsedMs: Math.round(elapsedMs), solved: state.solved };
    if (timeMs !== null) save.timeMs = Math.round(timeMs);
    vibe.saves.set(SAVE_KEY, save as unknown as Parameters<typeof vibe.saves.set>[1]).catch(() => {});
  }

  setInterval(() => {
    if (!running) return;
    tick();
    timerEl.textContent = fmtTime(elapsedMs);
    if (performance.now() - lastSaved > 5000) persist();
  }, 250);

  // ---------- Finishing ----------
  // The host shows the end card (score, best, share, next). The game just marks itself solved.
  function showSolved() {
    $(".cluebar", app).hidden = true;
    $(".solvedbar", app).hidden = false;
    $(".solved-time", app).textContent = `Solved in ${fmtTime(timeMs ?? 0)}`;
    const next = new Date();
    next.setUTCHours(24, 0, 0, 0);
    const hours = Math.max(1, Math.round((next.getTime() - Date.now()) / 3_600_000));
    $(".solved-next", app).textContent = `New puzzle in about ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  function finish() {
    tick();
    running = false;
    timeMs = Math.round(elapsedMs);
    persist();
    render();
    cells.forEach((el, i) => {
      if (!grid.blocks[i]) el.style.animationDelay = `${(Math.floor(i / grid.size) + (i % grid.size)) * 60}ms`;
    });
    vibe.end({ outcome: "complete", score: timeMs });
    vibe.events.track("level_end", { puzzle: puzzle.id, ms: timeMs });
    vibe.scores.submit(timeMs).catch(() => {});
    setTimeout(showSolved, 700);
  }

  // ---------- Input ----------
  function dispatch(a: Action) {
    if (!vibe.focused || vibe.paused || state.solved) return;
    const typedAt = state.cursor;
    state = step(grid, state, a);
    if (state.events.includes("typed")) {
      const el = cells[typedAt]!;
      el.classList.remove("pop");
      void el.offsetWidth; // restart the animation
      el.classList.add("pop");
    }
    if (state.events.includes("wrong")) toast(CONFIG.wrongMessage);
    render();
    if (state.events.includes("solved")) finish();
    else if (performance.now() - lastSaved > 1500) persist();
  }

  gridEl.addEventListener("pointerdown", (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (cell) dispatch({ type: "select", cell: Number(cell.dataset.cell) });
  });
  kb.addEventListener("pointerdown", (e) => {
    const key = (e.target as HTMLElement).closest<HTMLElement>("[data-key]")?.dataset.key;
    if (!key) return;
    e.preventDefault();
    dispatch(key === "Backspace" ? { type: "backspace" } : { type: "letter", ch: key });
  });
  $(".prev", app).addEventListener("pointerdown", () => dispatch({ type: "prevEntry" }));
  $(".next", app).addEventListener("pointerdown", () => dispatch({ type: "nextEntry" }));
  $(".clue", app).addEventListener("pointerdown", () => dispatch({ type: "toggle" }));
  $(".share", app).addEventListener("click", () =>
    vibe.share({ text: `${CONFIG.title} · ${prettyDay(day)} · solved in ${fmtTime(timeMs ?? 0)}`, score: timeMs ?? undefined }),
  );
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    let a: Action | null = null;
    if (/^[a-zA-Z]$/.test(k)) a = { type: "letter", ch: k };
    else if (k === "Backspace") a = { type: "backspace" };
    else if (k === "ArrowLeft") a = { type: "move", dr: 0, dc: -1 };
    else if (k === "ArrowRight") a = { type: "move", dr: 0, dc: 1 };
    else if (k === "ArrowUp") a = { type: "move", dr: -1, dc: 0 };
    else if (k === "ArrowDown") a = { type: "move", dr: 1, dc: 0 };
    else if (k === "Tab") a = { type: e.shiftKey ? "prevEntry" : "nextEntry" };
    else if (k === " " || k === "Enter") a = { type: "toggle" };
    if (a) {
      e.preventDefault();
      dispatch(a);
    }
  });

  // ---------- Platform lifecycle ----------
  vibe.onFocus(updateRunning);
  vibe.onPause(updateRunning);
  vibe.onResume(updateRunning);
  vibe.onRestart(() => render()); // a daily puzzle has no replay; the host hides "play again"

  if (info.context.mode === "test") {
    (window as unknown as { __vibeTest: object }).__vibeTest = {
      solution: grid.solution,
      cellCount: grid.solution.length,
    };
  }

  render();
  if (state.solved) showSolved();
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
