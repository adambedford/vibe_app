/**
 * Grid filler for the mini crossword. Models are bad at making grids whose words cross
 * correctly, so the agent (or a person) runs this to get valid fills and then writes clues.
 *
 *   pnpm tsx templates/mini-crossword/tools/fill.ts [count] [--seed s] [--theme words.txt] [--json]
 *
 * --theme takes a file of preferred words (one per line); the filler tries them first.
 * Output lists each fill with every entry and how common its words are (lower level = more common).
 */
import { readFileSync } from "node:fs";
import { PATTERNS, fill, loadLexicon, slots } from "@vibe/wordkit";

export { PATTERNS, fill, loadLexicon, slots };

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 10);
  const seedArg = args.indexOf("--seed");
  const themeArg = args.indexOf("--theme");
  const asJson = args.includes("--json");
  let seed = seedArg >= 0 ? Number(args[seedArg + 1]) : 1;
  const theme =
    themeArg >= 0
      ? new Set(readFileSync(args[themeArg + 1]!, "utf8").split(/\s+/).map((w) => w.toLowerCase()).filter(Boolean))
      : undefined;
  const lex = loadLexicon();
  const results: { rows: string[]; entries: string[]; score: number }[] = [];
  for (let i = 0; results.length < count && i < count * 20; i++, seed++) {
    const pattern = PATTERNS[i % PATTERNS.length]!;
    const rows = fill(pattern, lex, { seed, theme });
    if (!rows) continue;
    const entries = slots(pattern).map((s) => s.cells.map((c) => rows.join("")[c]).join("").toLowerCase());
    const score = entries.reduce((a, w) => a + lex.level.get(w)!, 0) / entries.length;
    results.push({ rows, entries, score });
  }
  results.sort((a, b) => a.score - b.score);
  if (asJson) console.log(JSON.stringify(results, null, 2));
  else
    for (const r of results) {
      console.log(r.rows.join("\n"));
      console.log("  " + r.entries.map((w) => `${w}(${lex.level.get(w)})`).join(" ") + `  avg level ${r.score.toFixed(1)}\n`);
    }
}
