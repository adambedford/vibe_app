/**
 * Turns a game project (template or game directory) into an immutable bundle:
 *   dist/games/<gameId>/<versionId>/{index.html, main.js, main.css?, manifest.json, assets/}
 * The version ID is a hash of the bundle's contents, so identical source gives the same version.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";
import { Manifest, SUPPORTED_ENGINES } from "@vibe/protocol";
import { DIST_GAMES, PLATFORM_MARKER } from "./paths.ts";
import { RESERVED_GAME_IDS } from "./origins.ts";

export interface BuiltGame {
  gameId: string;
  versionId: string;
  manifest: Manifest;
  dir: string;
  bytes: number;
}

export class BuildError extends Error {}

export async function readManifest(projectDir: string): Promise<Manifest> {
  const raw = JSON.parse(await readFile(path.join(projectDir, "game.json"), "utf8"));
  const parsed = Manifest.safeParse(raw);
  if (!parsed.success) {
    throw new BuildError(
      `${projectDir}/game.json: ` + parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  const m = parsed.data;
  if (!SUPPORTED_ENGINES[m.engine.name]?.includes(m.engine.version)) {
    throw new BuildError(`${projectDir}: unsupported engine ${m.engine.name}@${m.engine.version}`);
  }
  return m;
}

export async function buildGame(projectDir: string, gameId: string): Promise<BuiltGame> {
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(gameId) || RESERVED_GAME_IDS.has(gameId)) {
    throw new BuildError(`invalid game id "${gameId}"`);
  }
  const manifest = await readManifest(projectDir);
  const html = await readFile(path.join(projectDir, "index.html"), "utf8");
  if (!html.includes(PLATFORM_MARKER)) {
    throw new BuildError(`${projectDir}/index.html must contain ${PLATFORM_MARKER} in <head>`);
  }
  if (/<script[^>]+src=["']https?:/i.test(html)) {
    throw new BuildError(`${projectDir}/index.html must not load scripts from other origins; the platform injects the engine`);
  }

  const result = await esbuild.build({
    entryPoints: [path.join(projectDir, "src/main.ts")],
    bundle: true,
    format: "iife",
    target: "es2020",
    minify: true,
    write: false,
    outdir: "/out",
    entryNames: "main",
    loader: { ".json": "json", ".png": "dataurl", ".svg": "text" },
    logLevel: "silent",
  });
  const files = new Map<string, Buffer>();
  for (const f of result.outputFiles) files.set(path.basename(f.path), Buffer.from(f.contents));
  files.set("index.html", Buffer.from(html));
  files.set("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));

  const assetsDir = path.join(projectDir, "assets");
  const assets = existsSync(assetsDir) ? await listFiles(assetsDir) : [];
  const hash = createHash("sha256");
  for (const [name, buf] of [...files].sort(([a], [b]) => a.localeCompare(b))) hash.update(name).update(buf);
  for (const a of assets.sort()) hash.update(a).update(await readFile(path.join(assetsDir, a)));
  const versionId = hash.digest("hex").slice(0, 12);

  const outDir = path.join(DIST_GAMES, gameId, versionId);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  let bytes = 0;
  for (const [name, buf] of files) {
    await writeFile(path.join(outDir, name), buf);
    bytes += buf.length;
  }
  if (assets.length) await cp(assetsDir, path.join(outDir, "assets"), { recursive: true });
  for (const a of assets) bytes += (await stat(path.join(assetsDir, a))).size;

  return { gameId, versionId, manifest, dir: outDir, bytes };
}

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = path.join(prefix, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(path.join(dir, e.name), rel)));
    else out.push(rel);
  }
  return out;
}
