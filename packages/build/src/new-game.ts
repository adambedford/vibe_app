/**
 * `pnpm new-game <template> <gameId> [title]` copies a template into games/<gameId>.
 * A game is a full copy of its template's source, so the agent can change anything.
 */
import { existsSync } from "node:fs";
import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GAMES_DIR, TEMPLATES_DIR } from "./paths.ts";

const [template, gameId, ...titleParts] = process.argv.slice(2);
if (!template || !gameId) {
  console.error("usage: pnpm new-game <template> <gameId> [title]");
  process.exit(1);
}
const src = path.join(TEMPLATES_DIR, template);
const dest = path.join(GAMES_DIR, gameId);
if (!existsSync(path.join(src, "game.json"))) throw new Error(`no template "${template}"`);
if (existsSync(dest)) throw new Error(`games/${gameId} already exists`);
await cp(src, dest, { recursive: true });
const manifestPath = path.join(dest, "game.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (titleParts.length) manifest.title = titleParts.join(" ");
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`created games/${gameId} from templates/${template}`);
