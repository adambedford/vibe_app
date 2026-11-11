# Dodge (template)

Drag left and right to dodge falling rocks and grab stars. The game keeps getting faster. Engine: Phaser 4.2.1. Input: horizontal drag (`drag-x`).

## Files

| File | What it is | Change it? |
|---|---|---|
| `src/config.ts` | `CONFIG`: player speed, spawn rate, fall speeds, difficulty ramp, star value. `THEME`: colors | **Yes, first** |
| `src/main.ts` | Phaser renderer: starfield, ship, rocks, stars, particles, platform wiring | Yes, for new art and effects |
| `src/logic.ts` | The rules: pure `init`, `step`, `status`, `difficulty`, plus the bot (`botTarget`) | Carefully |
| `src/sfx.ts` | Synthesized sound effects | Yes |
| `playtest.ts` | How the checks play this game | Only if actions or phases change |
| `game.json` | Manifest | Title and description |

## Rules for changing it

1. **Keep logic pure:** no `Date`, `Math.random`, timers, DOM, network or Phaser in `logic.ts`. Use `rand(s)`.
2. **Effects come from events:** `start`, `spawn`, `star` and `die` are pushed by `step` and drawn by `main.ts`.
3. **Keep the platform calls** (`connect`, `firstFrame`/`ready`, `start`, `end`, and the pause, resume, focus, restart and audio handlers).
4. **Horizontal input only.** The feed owns vertical swipes, so keep the game's controls horizontal. If a new game needs vertical drags, change `input` in `game.json` to `drag` so the host knows.
5. **The bot plays attract mode.** If you add hazards, teach `botTarget` to avoid them.

## Ideas that work well

- **Reskins:** fish avoiding hooks, a car weaving through traffic, an umbrella catching raindrops while dodging lightning.
- **New falling things:** a `shield` that absorbs one hit, a `bomb` that clears the screen, or a big slow boulder.
- **Lanes:** snap `targetX` to three or five lanes for a tighter feel.

## Things to avoid

- Spawn rates below about 8 ticks at full difficulty: the screen fills faster than a thumb can react.
- Tiny objects (radius under 10). They are hard to see and feel unfair when they hit you.
