# Hop (template)

A one-tap runner. Tap to jump, tap again mid-air to double jump, clear the blocks, and the game speeds up as your score rises. Engine: Phaser 4.2.1.

## Files

| File | What it is | Change it? |
|---|---|---|
| `src/config.ts` | `CONFIG`: physics, speed, spawn gaps, obstacle sizes. `THEME`: colors and font | **Yes, first.** Most new games are a new theme plus tuned numbers |
| `src/main.ts` | Phaser renderer: textures, particles, tweens, sounds, platform wiring | Yes, for new art and effects |
| `src/logic.ts` | The rules: pure functions `init`, `step`, `status`, plus the bot | Carefully (see rules below) |
| `src/sfx.ts` | Synthesized sound effects | Yes, the `SOUNDS` table |
| `playtest.ts` | How the checks play this game | Only if you change the actions or phases |
| `game.json` | Manifest: title, description, engine, capabilities, boards | Title and description |

## Rules for changing it

1. **Keep logic pure.** `logic.ts` must not use `Date`, `Math.random`, timers, `window`, `document`, `fetch` or Phaser. Randomness comes from `rand(s)`, which advances the seeded generator stored in the state. The checks run the logic in a sandbox without those APIs, so any slip fails.
2. **Everything visible comes from state plus events.** `step` pushes events (`jump`, `land`, `score`, `spawn`, `die`); the renderer reacts to them with effects. Add an event when you add an effect.
3. **Keep the platform calls.** `vibe.connect`, `vibe.firstFrame` / `vibe.ready` in the first `update`, `vibe.start` when a run starts, `vibe.end` on death, and the `onPause`, `onResume`, `onFocus`, `onRestart` and `onAudio` handlers. The checks fail without them.
4. **Attract mode matters.** In the feed the game plays itself (`botShouldTap`) until someone taps in. If you change the rules, make sure the bot still plays convincingly; `pnpm check hop` reports the bot's mean score.
5. **No network and no external assets.** Draw textures in `makeTextures()`, or add files to `assets/` and load them with relative paths.

## Ideas that work well

- **Reskins:** a cat jumping cucumbers, a skier jumping rocks, a rocket over asteroids. Change `THEME`, the player texture and the obstacle drawing.
- **Tuning:** floatier jumps (lower `gravity`), a faster start, wider obstacles sooner.
- **New obstacle types:** add a `kind` to `Obstacle`, spawn it in `step` with `rand(s)`, draw it in the `spawn` event.
- **Collectibles:** coins above some obstacles that add to the score, with a `coin` event for a sparkle.

## Things to avoid

- Removing the double jump without widening gaps: some obstacle sequences become impossible. The bot's score in `pnpm check` will drop toward zero if that happens.
- Text smaller than 18 px in the 360×640 world; it becomes unreadable on phones.
