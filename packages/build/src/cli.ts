/**
 * `pnpm build`: SDK + engines -> dist/engine, every template and game -> dist/games,
 * the web app -> dist/app, plus dist/app/catalog.json listing each game's current version.
 */
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";
import { SDK_VERSION } from "@vibe/protocol";
import { buildGame, type BuiltGame } from "./build-game.ts";
import { sri } from "./edge.ts";
import { DIST_APP, DIST_ENGINE, ENGINE_FILES, GAMES_DIR, ROOT, TEMPLATES_DIR, enginePath, sdkPath } from "./paths.ts";

export interface CatalogItem {
  gameId: string;
  versionId: string;
  source: string;
  manifest: BuiltGame["manifest"];
  bytes: number;
  poster?: string;
}

async function buildEngine() {
  const integrity: Record<string, string> = {};
  const sdk = await esbuild.build({
    entryPoints: [path.join(ROOT, "packages/sdk/src/index.ts")],
    bundle: true,
    format: "iife",
    target: "es2020",
    minify: true,
    write: false,
    logLevel: "silent",
  });
  const sdkOut = path.join(DIST_ENGINE, sdkPath(SDK_VERSION));
  await mkdir(path.dirname(sdkOut), { recursive: true });
  const sdkBuf = Buffer.from(sdk.outputFiles[0]!.contents);
  await writeFile(sdkOut, sdkBuf);
  integrity[sdkPath(SDK_VERSION)] = sri(sdkBuf);

  for (const [key, rel] of Object.entries(ENGINE_FILES)) {
    const [name, version] = key.split("@") as [string, string];
    const out = path.join(DIST_ENGINE, enginePath(name, version));
    await mkdir(path.dirname(out), { recursive: true });
    await copyFile(path.join(ROOT, rel), out);
    integrity[enginePath(name, version)] = sri(await readFile(out));
  }
  await writeFile(path.join(DIST_ENGINE, "integrity.json"), JSON.stringify(integrity, null, 2));
  return { sdkBytes: sdkBuf.length };
}

async function projectDirs(root: string): Promise<string[]> {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const e of await readdir(root, { withFileTypes: true })) {
    if (e.isDirectory() && existsSync(path.join(root, e.name, "game.json"))) out.push(path.join(root, e.name));
  }
  return out.sort();
}

async function buildApp() {
  await mkdir(DIST_APP, { recursive: true });
  await esbuild.build({
    entryPoints: {
      feed: path.join(ROOT, "apps/web/src/feed.ts"),
      play: path.join(ROOT, "apps/web/src/play.ts"),
    },
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: true,
    sourcemap: true,
    outdir: DIST_APP,
    logLevel: "warning",
  });
  for (const f of ["index.html", "play.html", "styles.css"]) {
    await copyFile(path.join(ROOT, "apps/web", f), path.join(DIST_APP, f));
  }
}

export async function buildAll({ quiet = false } = {}) {
  const t0 = performance.now();
  const { sdkBytes } = await buildEngine();
  const catalog: CatalogItem[] = [];
  for (const dir of [...(await projectDirs(GAMES_DIR)), ...(await projectDirs(TEMPLATES_DIR))]) {
    const gameId = path.basename(dir);
    const g = await buildGame(dir, gameId);
    catalog.push({
      gameId,
      versionId: g.versionId,
      source: path.relative(ROOT, dir),
      manifest: g.manifest,
      bytes: g.bytes,
      poster: existsSync(path.join(DIST_APP, "posters", `${gameId}.png`)) ? `/posters/${gameId}.png` : undefined,
    });
  }
  await buildApp();
  await writeFile(path.join(DIST_APP, "catalog.json"), JSON.stringify(catalog, null, 2));
  if (!quiet) {
    console.log(`sdk ${SDK_VERSION}: ${(sdkBytes / 1024).toFixed(1)} KB`);
    for (const c of catalog) {
      console.log(
        `${c.gameId.padEnd(18)} ${c.versionId}  ${(c.bytes / 1024).toFixed(1).padStart(7)} KB  ${c.manifest.engine.name}@${c.manifest.engine.version}`,
      );
    }
    console.log(`built in ${Math.round(performance.now() - t0)} ms`);
  }
  return catalog;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
