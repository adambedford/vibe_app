# Daily mini crossword (template)

A 5×5 crossword with one puzzle a day, the same for everyone. The board is fastest time today, and progress is saved if you leave mid-puzzle. Engine: none (plain DOM). Input: taps on the grid and an on-screen keyboard; physical keyboards also work.

## Files

| File | What it is | Change it? |
|---|---|---|
| `src/puzzles.ts` | The puzzle pack: grid rows and clues | **Yes.** This is the content |
| `src/config.ts` | Title and the "wrong answer" message | Yes |
| `src/styles.css` | `:root` color and font variables, layout | Yes, for a new look |
| `src/main.ts` | Renderer, keyboard, timer, saves, platform wiring | Rarely |
| `src/logic.ts` | Rules: parsing, numbering, cursor movement, solving, day → puzzle | Rarely; keep it pure |
| `tools/fill.ts` | Grid filler: finds valid fills from a common-word list | Use it; don't hand-make grids |
| `playtest.ts` | How the checks solve puzzles | No |

## Making a new puzzle pack

Models are bad at making grids whose crossing words all work, so **always generate grids with the filler**, then write the clues.

```bash
pnpm tsx templates/mini-crossword/tools/fill.ts 30 --seed 7                 # 30 candidate grids, most common words first
pnpm tsx templates/mini-crossword/tools/fill.ts 30 --theme cats.txt        # prefer words from a list (one per line)
```

1. Pick grids made of common, friendly words. Skip anything obscure, plural-only or awkward (the output shows each word's commonness level; 10 is the most common).
2. Copy the rows into `PUZZLES` and write one clue per entry, keyed by number under `across` and `down`. Numbers run left to right, top to bottom, on every cell that starts an across or down entry. `pnpm test` names any missing or extra clue number.
3. Clue style: short, fair, a little playful. A solver should get most answers without crossings. Avoid trivia that needs specialist knowledge.
4. Run `pnpm test`. It checks every grid parses, every answer is a real word, every entry has a clue, and no answer repeats within a puzzle.

## Themes that work well

- **Topic packs:** cats, food, space, sport. Write a `--theme` word list of 50–200 topic words, let the filler prefer them, then clue the theme words with a wink.
- **Harder or easier days:** easy on Monday, tricky on Saturday. Order the pack accordingly (`puzzleForDay` cycles from 1 January 2026).
- **A new look:** change the `:root` variables in `styles.css`. Keep strong contrast for the cursor and highlighted entry.

## Rules for changing it

1. **Keep logic pure.** No `Date` in `logic.ts`: `dayIndex` computes days without it.
2. **Same puzzle for everyone on a day.** The day comes from the host (`vibe.context.daily.day`, in UTC), never from the device clock.
3. **The timer only runs while the game is focused and not paused.** Keep `updateRunning` wired to the focus, pause and resume handlers.
4. **No phone keyboard.** The on-screen keyboard avoids the phone's own keyboard, which would resize the page inside the feed.
5. **Avoid other publishers' names and looks.** Don't name it after a newspaper's puzzle or copy their colors.

## Content rules

The filler blocks offensive and off-tone words, but **read every grid and clue before publishing**. Clues are text that every player sees, and they go through the same content checks as any other game text.
