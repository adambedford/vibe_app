/**
 * Static export for hosting on two plain domains (e.g. two *.vercel.app projects), with
 * games in path mode: one games origin, each game at /g/<id>/v/<version>/, engine at /e/.
 * The app stays cross-site from the games; games share one origin with each other (weaker
 * than per-game subdomains, which need a domain we control; see docs/decisions.md D32).
 *
 *   APP_ORIGIN=https://... GAMES_ORIGIN=https://... tsx packages/build/src/export.ts app|games
 *
 * Security headers and the direct-visit redirect become routes in the build output config.
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Manifest } from "@vibe/protocol";
import { appCsp, gameCsp, injectPlatform, PERMISSIONS_POLICY } from "./edge.ts";
import type { Origins } from "./origins.ts";
import { DIST_APP, DIST_ENGINE, DIST_GAMES, ROOT } from "./paths.ts";

export function pathOrigins(app: string, games: string): Origins {
  return {
    app,
    engine: `${games}/e`,
    gamesSuffix: "",
    gameUrlTemplate: `${games}/g/{game}/v/{version}/`,
    gamesSource: games,
  };
}

/**
 * Output follows Vercel's Build Output API v3: <out>/static for files and <out>/config.json
 * for routes (headers, redirects). Defaults to <repo>/.vercel/output, which Vercel picks up
 * after the build command, so two projects can build different targets from one repo.
 */
const DEFAULT_OUT = path.join(ROOT, ".vercel/output");

type Route = Record<string, unknown>;

async function writeOutput(out: string, routes: Route[]) {
  await writeFile(path.join(out, "config.json"), JSON.stringify({ version: 3, routes }, null, 2));
}

export async function exportApp(o: Origins, out = DEFAULT_OUT) {
  await rm(out, { recursive: true, force: true });
  const statik = path.join(out, "static");
  await cp(DIST_APP, statik, { recursive: true });
  await writeFile(path.join(statik, "config.json"), JSON.stringify({ gameUrlTemplate: o.gameUrlTemplate, engine: o.engine }));
  await writeOutput(out, [
    {
      src: "/(.*)",
      headers: {
        "Content-Security-Policy": appCsp(o),
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "no-cache",
      },
      continue: true,
    },
    { src: "^/$", dest: "/index.html" },
    { handle: "filesystem" },
  ]);
  return out;
}

export async function exportGames(o: Origins, out = DEFAULT_OUT) {
  await rm(out, { recursive: true, force: true });
  const statik = path.join(out, "static");
  await mkdir(statik, { recursive: true });
  await cp(DIST_ENGINE, path.join(statik, "e"), { recursive: true });
  const integrity = JSON.parse(await readFile(path.join(DIST_ENGINE, "integrity.json"), "utf8"));
  for (const game of await readdir(DIST_GAMES)) {
    for (const version of await readdir(path.join(DIST_GAMES, game))) {
      const src = path.join(DIST_GAMES, game, version);
      const dest = path.join(statik, "g", game, "v", version);
      await cp(src, dest, { recursive: true });
      const manifest = JSON.parse(await readFile(path.join(src, "manifest.json"), "utf8")) as Manifest;
      const html = await readFile(path.join(src, "index.html"), "utf8");
      await writeFile(path.join(dest, "index.html"), injectPlatform(html, manifest, o, integrity));
    }
  }
  await writeOutput(out, [
    // Game documents only load inside the app's iframe; a direct visit goes to the app.
    {
      src: "^/g/([a-z0-9-]+)/v/([a-f0-9]+)/(index\\.html)?$",
      has: [{ type: "header", key: "sec-fetch-dest", value: "document" }],
      status: 302,
      headers: { Location: `${o.app}/play.html?game=$1` },
    },
    { src: "^/$", status: 302, headers: { Location: `${o.app}/` } },
    {
      src: "^/e/(.*)$",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      continue: true,
    },
    {
      src: "^/g/(.*)$",
      headers: {
        "Content-Security-Policy": gameCsp(o),
        "Permissions-Policy": PERMISSIONS_POLICY,
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
      continue: true,
    },
    { src: "^/g/([a-z0-9-]+)/v/([a-f0-9]+)/$", dest: "/g/$1/v/$2/index.html" },
    { handle: "filesystem" },
  ]);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  const app = process.env.APP_ORIGIN?.replace(/\/$/, "");
  const games = process.env.GAMES_ORIGIN?.replace(/\/$/, "");
  if (!app || !games || (target !== "app" && target !== "games")) {
    console.error("usage: APP_ORIGIN=... GAMES_ORIGIN=... export.ts app|games");
    process.exit(1);
  }
  const o = pathOrigins(app, games);
  const out = target === "app" ? await exportApp(o) : await exportGames(o);
  console.log(`exported ${target} to ${out}`);
}
