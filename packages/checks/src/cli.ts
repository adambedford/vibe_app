/**
 * `pnpm check [gameId...] [--cpu=4]` builds everything, then runs the headless rule checks
 * and the browser checks for each game. Writes dist/checks/<gameId>.json and posters,
 * prints a summary, and exits non-zero if any hard check fails.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { DIST, ROOT, buildAll, startEdge } from "@vibe/build";
import { checkInBrowser } from "./browser.ts";
import { checkLogic, type CheckResult } from "./logic.ts";
import type { Playtest } from "./types.ts";

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const cpu = Number(args.find((a) => a.startsWith("--cpu="))?.slice(6) ?? 4);

const catalog = await buildAll({ quiet: true });
const edge = await startEdge({ port: 0 });
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--enable-precise-memory-info"] });
await mkdir(path.join(DIST, "checks"), { recursive: true });

let failed = 0;
const rows: string[] = [];
for (const item of catalog.filter((c) => only.length === 0 || only.includes(c.gameId))) {
  const dir = path.join(ROOT, item.source);
  const logic = await checkLogic(dir);
  let playtest: Playtest | null = null;
  try {
    playtest = ((await import(pathToFileURL(path.join(dir, "playtest.ts")).href)) as { playtest: Playtest }).playtest;
  } catch {
    playtest = null;
  }
  const web = await checkInBrowser(browser, edge, item, playtest, { cpuThrottle: cpu });
  const all: CheckResult[] = [...logic.results, ...web.results];
  const fails = all.filter((r) => !r.ok && r.level === "fail");
  const warns = all.filter((r) => !r.ok && r.level === "warn");
  if (fails.length) failed++;
  await writeFile(
    path.join(DIST, "checks", `${item.gameId}.json`),
    JSON.stringify({ gameId: item.gameId, versionId: item.versionId, logic, browser: { ...web, requests: web.requests.length } }, null, 2),
  );

  console.log(`\n${fails.length ? "✗" : "✓"} ${item.gameId} (${item.versionId})`);
  for (const r of all) {
    const mark = r.ok ? "  ok  " : r.level === "fail" ? "  FAIL" : "  warn";
    console.log(`${mark}  ${r.name.padEnd(24)} ${r.detail ?? ""}`);
  }
  rows.push(
    `${item.gameId.padEnd(16)} ${fails.length ? "FAIL" : "pass"}  ready ${String(web.readyMs ?? "-").padStart(5)} ms  ` +
      `fps ${String(web.fps ?? "-").padStart(3)}  heap ${String(web.heapMB ?? "-").padStart(5)} MB  ` +
      `bundle ${(item.bytes / 1024).toFixed(1)} KB  warnings ${warns.length}`,
  );
}

console.log(`\nSummary (CPU throttled ${cpu}× for boot timing)\n` + rows.join("\n"));
await browser.close();
await edge.close();
// Rebuild the catalog so posters captured above are listed.
await buildAll({ quiet: true });
process.exit(failed ? 1 : 0);
