# Flipside (template)

A daily word puzzle played with taps only. Every tile has a letter on each side, and the other side shows small in the corner. Tap a tile to flip it. The puzzle is solved when every across and down entry is a word. Entries that spell any real word light up, so tempting wrong words (red herrings) light up too; only the crossings tell you which is right.

Scoring: time on the daily board, plus flips against par (the fewest flips possible). The share text is a spoiler-free grid: 🟩 for a tile flipped no more than needed, 🟨 for one flipped back and forth.

Engine: none (plain DOM). Input: taps.

## Files

| File | What it is | Change it? |
|---|---|---|
| `src/puzzles.ts` | The pack: a demo puzzle (shown in the feed) and the daily puzzles | **Regenerate it with the tool** |
| `src/config.ts` | Title and help text | Yes |
| `src/styles.css` | `:root` colors and font, tile look, flip animation | Yes, for a new look |
| `src/main.ts` | Renderer, attract-mode demo, timer, saves, share text, platform wiring | Rarely |
| `src/logic.ts` | Rules: parsing, flipping, lighting, solved check, day → puzzle | Rarely; keep it pure |
| `tools/make.ts` | Generator: fills a grid, picks the other-side letters, checks uniqueness and deducibility | Use it |
| `tools/analyze.ts` | Counts solutions, checks the puzzle can be solved by deduction, counts herrings | No |

## Making a puzzle pack

```bash
pnpm tsx templates/flipside/tools/make.ts 15 --seed 7                      # print 15 candidates to review
pnpm tsx templates/flipside/tools/make.ts 15 --seed 7 --out src/puzzles.ts # write them (the first becomes the demo)
pnpm test                                                                   # every puzzle: one solution, deducible, common answers
```

- **Answers** come from the two most common word levels, so solutions are everyday words.
- **Lighting** uses a bigger list, so less common words can light up as herrings.
- **Difficulty** is the number of herrings: `--min` and `--max`, default 8–14. More herrings means more tempting wrong turns; above about 16 it starts to feel like a slog.
- **Every generated puzzle** has exactly one solution, and it can be reached by elimination alone, with no guessing. Keep it that way: it's what makes the game fair.
- **Read the herrings before publishing.** The generator blocks offensive words, but people see every word that lights up.

## Ideas for new games from this template

- **Themed packs:** make answers favour a theme. Fill from a theme word list (see the crossword's `--theme` option in `@vibe/wordkit`).
- **Bigger boards:** 6×6 boards with more blocks, for a weekend edition.
- **Different scoring:** fewest flips as the main board instead of time (`game.json` already declares both boards).

## Rules for changing it

1. **Keep logic pure:** no `Date`, timers, DOM or randomness in `logic.ts`.
2. **Never show today's puzzle in attract mode.** The feed shows the demo puzzle playing itself, and today's appears only after the player taps in.
3. **The day comes from the host** (`vibe.context.daily.day`, UTC). Everyone gets the same puzzle.
4. **Ship word lists, not a dictionary.** Each puzzle carries the words each entry can spell, so the bundle stays small.
