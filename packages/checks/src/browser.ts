/**
 * Browser checks: load a game through the real host (play.html), then boot, attract,
 * focus, input response, pause/resume, playthrough, network, errors. Saves a poster.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Browser, CDPSession, Frame, Page } from "playwright";
import type { Edge } from "@vibe/build";
import { POSTERS_DIR } from "@vibe/build";
import type { CatalogItem } from "@vibe/build";
import type { CheckResult } from "./logic.ts";
import type { Driver, Playtest } from "./types.ts";

export interface BrowserReport {
  results: CheckResult[];
  firstFrameMs?: number;
  readyMs?: number;
  fps?: number;
  heapMB?: number;
  requests: string[];
  poster?: string;
}

interface HostEvent {
  t: number;
  e: { type: string; ms?: number; outcome?: string; score?: number; message?: string; reason?: string };
}

const BUDGET = { readyMs: 1500, readyMsHard: 5000, startAfterInputMs: 1500, playthroughMs: 60_000 };
const BENIGN_CONSOLE = [/GL Driver Message/, /GPU stall/, /WebGL/i, /AudioContext was not allowed/];

export async function checkInBrowser(
  browser: Browser,
  edge: Edge,
  item: CatalogItem,
  playtest: Playtest | null,
  opts: { cpuThrottle: number },
): Promise<BrowserReport> {
  const results: CheckResult[] = [];
  const add = (name: string, ok: boolean, detail?: string, level: "fail" | "warn" = "fail") =>
    results.push({ name, ok, level, detail });
  const report: BrowserReport = { results, requests: [] };

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  // tsx compiles functions passed to evaluate() with an esbuild `__name` helper; define it in test pages.
  await context.addInitScript({ content: "globalThis.__name ??= (f) => f;" });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !BENIGN_CONSOLE.some((r) => r.test(m.text()))) consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`uncaught: ${e.message}`));
  const gameOrigin = new URL(edge.origins.gameUrlTemplate.replace("{game}", item.gameId).replace("{version}", item.versionId)).origin;
  const allowed = [edge.origins.app, edge.origins.engine, gameOrigin];
  page.on("request", (r) => {
    const u = r.url();
    if (u.startsWith("data:") || u.startsWith("blob:")) return;
    report.requests.push(u);
  });

  const events = async (): Promise<HostEvent[]> =>
    page.evaluate(() => ((window as unknown as { __host?: { events: HostEvent[] } }).__host?.events ?? []) as HostEvent[]);
  let closing = false;
  const waitFor = async (type: string, timeout: number, after = -1): Promise<HostEvent | null> => {
    const t0 = Date.now();
    try {
      while (!closing && Date.now() - t0 < timeout) {
        const ev = (await events()).find((x) => x.e.type === type && x.t > after);
        if (ev) return ev;
        await page.waitForTimeout(50);
      }
    } catch {
      /* page closed */
    }
    return null;
  };
  let watch: Promise<void> = Promise.resolve();
  const host = (fn: string, arg?: unknown) =>
    page.evaluate(([f, a]) => (window as unknown as { __host: Record<string, (x?: unknown) => void> }).__host[f as string]!(a), [fn, arg] as const);

  try {
    // 1. Boot in attract mode (as in the feed).
    await page.goto(`${edge.origins.app}/play.html?game=${item.gameId}&mode=test&focus=0`);
    const iframe = page.locator("iframe.vibe-game-frame");
    await iframe.waitFor({ timeout: 5000 });
    let game: Frame | null = null;
    for (let i = 0; i < 100 && !game; i++) {
      game = page.frames().find((f) => f.url().startsWith(gameOrigin)) ?? null;
      if (!game) await page.waitForTimeout(50);
    }
    let cdp: CDPSession | null = null;
    if (game && opts.cpuThrottle > 1) {
      try {
        cdp = await context.newCDPSession(game);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: opts.cpuThrottle });
      } catch {
        cdp = null;
      }
    }
    const ff = await waitFor("firstFrame", BUDGET.readyMsHard);
    const ready = await waitFor("ready", BUDGET.readyMsHard);
    report.firstFrameMs = ff?.e.ms;
    report.readyMs = ready?.e.ms;
    add("boot.first_frame", !!ff, ff ? `${ff.e.ms} ms` : "no firstFrame within 5 s");
    add("boot.ready", !!ready, ready ? `${ready.e.ms} ms` : "no ready within 5 s");
    if (ready?.e.ms !== undefined) {
      add("boot.ready_budget", ready.e.ms <= BUDGET.readyMs, `${ready.e.ms} ms (budget ${BUDGET.readyMs} ms at ${opts.cpuThrottle}× CPU throttle)`, "warn");
    }
    if (!ready || !game) throw new Error("game did not boot");

    // 2. Attract mode: poster, and is it alive?
    await page.waitForTimeout(1500);
    const stage = page.locator(".stage");
    await mkdir(POSTERS_DIR, { recursive: true });
    report.poster = path.join(POSTERS_DIR, `${item.gameId}.png`);
    await iframe.screenshot({ path: report.poster });
    const a1 = await iframe.screenshot();
    await page.waitForTimeout(700);
    const a2 = await iframe.screenshot();
    add("attract.animates", !a1.equals(a2), a1.equals(a2) ? "nothing moves in attract mode" : undefined, "warn");

    // 3. Focus and first input -> start.
    const box = (await iframe.boundingBox())!;
    const tapAt = (x: number, y: number) => page.touchscreen.tap(box.x + box.width * x, box.y + box.height * y);
    const tBefore = (await events()).at(-1)?.t ?? -1;
    await host("focus", true);
    await page.waitForTimeout(150);
    const inputs = item.manifest.input;
    if (!playtest?.browser) {
      if (inputs.includes("drag-x")) await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.8);
      else await tapAt(0.5, 0.6);
    }
    const started = await waitFor("start", BUDGET.startAfterInputMs, tBefore);
    add("input.starts_run", !!started, started ? undefined : "no `start` within 1.5 s of focus + first input");

    // 4. Pause stops rendering; resume restarts it.
    await host("pause");
    await page.waitForTimeout(300);
    const p1 = await iframe.screenshot();
    await page.waitForTimeout(1100);
    const p2 = await iframe.screenshot();
    add("lifecycle.pause_stops", p1.equals(p2), p1.equals(p2) ? undefined : "frames still change while paused");
    await host("resume");
    await page.waitForTimeout(1100);
    const p3 = await iframe.screenshot();
    add("lifecycle.resume", !p3.equals(p2), p3.equals(p2) ? "nothing changed after resume" : undefined, "warn");

    // 5. Playthrough until `end`.
    const tPlay = (await events()).at(-1)?.t ?? -1;
    let seed = 12345;
    const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    let endedFlag = false;
    const driver: Driver = {
      tap: tapAt,
      drag: async (pts, ms) => {
        const [first, ...rest] = pts;
        if (!first) return;
        await page.mouse.move(box.x + box.width * first[0], box.y + box.height * first[1]);
        await page.mouse.down();
        for (const [x, y] of rest) {
          await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 4 });
          await page.waitForTimeout(ms / Math.max(1, rest.length));
        }
        await page.mouse.up();
      },
      key: (k) => page.keyboard.press(k),
      click: async (sel) => {
        await game!.locator(sel).first().dispatchEvent("pointerdown", { bubbles: true });
      },
      evaluate: (fn) => game!.evaluate(fn),
      wait: (ms) => page.waitForTimeout(ms),
      ended: () => endedFlag,
      rand,
    };
    watch = (async () => {
      endedFlag = !!(await waitFor("end", BUDGET.playthroughMs, tPlay));
    })();
    const t0 = Date.now();
    if (playtest?.browser) {
      await playtest.browser(driver);
    } else {
      while (!endedFlag && Date.now() - t0 < BUDGET.playthroughMs) {
        if (inputs.includes("drag-x")) await driver.drag([[rand(), 0.8], [rand(), 0.8], [rand(), 0.8]], 300);
        else await tapAt(0.3 + rand() * 0.4, 0.5 + rand() * 0.3);
        await page.waitForTimeout(150 + rand() * 450);
      }
    }
    await watch;
    const end = (await events()).find((x) => x.e.type === "end" && x.t > tPlay);
    add("play.reaches_end", !!end, end ? `${end.e.outcome}, score ${end.e.score} after ${Math.round((Date.now() - t0) / 1000)} s` : "no `end` within 60 s of bot play");

    // 6. Restart works (not for daily puzzles).
    if (end && !item.manifest.daily) {
      const tR = (await events()).at(-1)?.t ?? -1;
      await host("restart");
      await page.waitForTimeout(400);
      if (inputs.includes("drag-x")) await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.8);
      else await tapAt(0.5, 0.6);
      const again = await waitFor("start", 2000, tR);
      add("lifecycle.restart", !!again, again ? undefined : "no `start` after restart + input");
    }

    // 7. Runtime stats (unthrottled numbers are optimistic; device tests are the real measure).
    if (cdp) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    report.fps = await game.evaluate(
      `new Promise((resolve) => { let n = 0; const t = performance.now();
         const f = () => (performance.now() - t < 1000 ? (n++, requestAnimationFrame(f)) : resolve(n));
         requestAnimationFrame(f); })`,
    );
    const heap = (await game.evaluate("performance.memory ? performance.memory.usedJSHeapSize : 0")) as number;
    if (heap) report.heapMB = Math.round((heap / 1024 / 1024) * 10) / 10;
    if (report.heapMB !== undefined) add("perf.heap", report.heapMB < 150, `${report.heapMB} MB`, "warn");
  } catch (e) {
    add("browser.run", false, e instanceof Error ? e.message.split("\n")[0] : String(e));
  }

  // Host-side findings
  const evs = await events().catch(() => [] as HostEvent[]);
  const gameErrors = evs.filter((x) => x.e.type === "error").map((x) => x.e.message ?? "");
  const violations = evs.filter((x) => x.e.type === "violation").map((x) => x.e.reason ?? "");
  add("errors.game", gameErrors.length === 0, gameErrors.slice(0, 3).join(" | ") || undefined);
  add("errors.protocol", violations.length === 0, violations.slice(0, 3).join(" | ") || undefined);
  add("errors.console", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | ") || undefined);
  const outside = report.requests.filter((u) => !allowed.some((o) => u.startsWith(o)));
  add("network.allowed_only", outside.length === 0, outside.slice(0, 3).join(", ") || undefined);
  closing = true;
  await watch;
  await context.close();
  return report;
}
