import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const DIST = path.join(ROOT, "dist");
export const DIST_APP = path.join(DIST, "app");
export const DIST_ENGINE = path.join(DIST, "engine");
export const DIST_GAMES = path.join(DIST, "games");
export const TEMPLATES_DIR = path.join(ROOT, "templates");
export const GAMES_DIR = path.join(ROOT, "games");
/** Feed posters captured by `pnpm check`; committed so hosted builds have them. */
export const POSTERS_DIR = path.join(ROOT, "apps/web/posters");

export const PLATFORM_MARKER = "<!-- vibe:platform -->";

/** Engine files the platform serves, by name@version, relative to ROOT. */
export const ENGINE_FILES: Record<string, string> = {
  "phaser@4.2.1": "node_modules/phaser/dist/phaser.min.js",
};

export function enginePath(name: string, version: string): string {
  return name === "phaser" ? `/phaser/${version}/phaser.min.js` : "";
}

export function sdkPath(version: string): string {
  return `/sdk/${version}/vibe.js`;
}
