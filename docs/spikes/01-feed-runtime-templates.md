# Step 1: feed, runtime and templates

Date: 2026-11-11. Status: built and passing its own checks in headless Chromium. **Not yet tried on real phones or in WebKit.**

## What was built

- **Game contract** (`packages/protocol`): the manifest schema and every message a game may send, validated with zod.
- **SDK** (`packages/sdk`), 3.4 KB: lifecycle, focus/attract, pause/resume, host-owned mute, restart, saves, score boards (ascending or descending, all-time or daily), events, share, seeded random. It is served from the engine CDN and injected by the edge, so a game can't load the wrong version.
- **Host** (`packages/host`): one sandboxed iframe per game on its own origin, a private `MessageChannel` after a checked handshake, and schema validation, size limits, rate limits and capability checks on every message. Games see a per-game player ID and nothing else about the person.
- **Edge** (`packages/build/src/edge.ts`), as a local server:
  - **Per-game origins** (`<game>.games.localhost`), plus a shared engine origin.
  - **Strict headers:** CSP, Permissions-Policy and `frame-ancestors`.
  - **Iframe-only serving:** a direct visit redirects to the app.
  - **Immutable versions** with SRI on the engine and SDK.
  - **Kill switch:** `dist/blocked.json` returns 410 for a game or version.
- **Bundler:** turns a game project into an immutable, content-hashed version. Games are 11–18 KB, plus Phaser (1.38 MB raw, about 350 KB compressed), which is cached once and shared across games.
- **Feed** (`apps/web`):
  - **Feed itself:** vertical snap scrolling with posters, and at most three live frames.
  - **Gesture model B:** attract mode under a tap layer, then focus mode locks the feed.
  - **App controls:** a top bar in focus mode, a host-owned end card (play again, challenge, next), and a global mute.
  - **Host-measured events:** impression, first frame, ready, focus time, run start/end, quick swipe-away.
- **Single-game page:** for deep links and challenge links (`play.html?game=hop&challenge=42.ab12cd34`).
- **Templates**, each with pure rules, a renderer, a bot for attract mode and the checks, and a `TEMPLATE.md`:
  - **Hop:** a one-tap runner (Phaser 4).
  - **Dodge:** drag to dodge (Phaser 4).
  - **Daily 5×5:** a mini crossword (plain DOM). It has a grid-filler tool, 13 puzzles cycling daily, saved progress, a daily fastest-time board and an on-screen keyboard.
- **Playtest harness** (`pnpm check`):
  - **Headless:** rules run in a VM with no `Date`, `Math.random`, timers or DOM. Checks are purity, determinism, fuzzing, monotonic score, finishability, bot score, state size and step speed.
  - **Browser:** through the real host with the CPU slowed 4×. Checks are boot and ready time, attract animation, input → start, pause stops rendering, resume, playthrough to `end`, restart, heap, console and game errors, protocol violations, and only allowed network requests. It also saves the feed poster.
- **Unit tests** (29): crossword rules and the puzzle pack, edge security behaviour, protocol schemas, and the rate limiter.

## Numbers (headless Chromium on a server, CPU throttled 4× for boot)

| Game | Ready after frame created | FPS | JS heap | Bundle |
|---|---|---|---|---|
| Dodge | 439 ms | 60 | 17.7 MB | 11.1 KB |
| Hop | 274 ms | 60 | 18.5 MB | 11.5 KB |
| Daily 5×5 | 62 ms | 60 | 6.4 MB | 17.6 KB |

These numbers are optimistic. Software WebGL on a server is not a mid-range phone; real devices are the test that counts.

## Findings

1. **Chromium doesn't render off-screen cross-origin iframes.**
   - **What we saw:** the "next" game, preloaded paused below the fold, downloads its code but draws no first frame until it scrolls into view. Hop's first frame came 4.8 s after mounting off-screen, against about 0.3–0.4 s on screen.
   - **Current mitigation:** the harness-captured poster covers the gap.
   - **Options:** stage the next game in an on-screen layer behind the current one, or accept a short poster-to-live swap.
   - **Next:** decide after device tests; WebKit may behave differently.
2. **The bot is a quality instrument as well as a test tool.**
   - **What we saw:** Hop's first bot averaged 1.6 points, so attract mode in the feed would have shown a game dying straight away. A look-ahead bot averages about 148 and never crashes in two minutes at top speed.
   - **What this proves:** the obstacle generator never produces an impossible gap.
   - **What it does not prove:** whether the game is too easy for people.
   - **Next:** "bot mean score" now appears in every check report, and should become a feed-ranking prior for new games.
3. **The app's controls covered game UI.** The brand, mute and "Next" sat over the crossword's title and the games' score text. Focus mode now reserves a 48 px top bar (plus the safe area), and the game starts below it. Attract mode keeps the overlays, since nothing is interactive there.
4. **One end card, owned by the app.** The crossword's own "Solved" panel stacked under the app's end card. Rule: games mark themselves finished, and the app shows the result, best, share and next. This is now in the template docs.
5. **Crossword grids come from a solver; the agent writes the clues.** The filler finds valid 5×5 fills from about 5,700 common words (SCOWL levels 10–35) in a few seconds. About a third of the candidates were good enough to publish; the rest had words like MAS or HOCKS. Clues are the creative part, and the agent (or a person) writes them; `pnpm test` checks every answer and clue number.
6. **Phaser 4.2.1 accepted Phaser 3-style code.** The only change needed was a type fix (`fillPoints` takes `Vector2`). That's weak evidence; the agent spike on 50 prompts is the real test (decision D20).
7. **Harness gotcha:** functions passed to Playwright's `evaluate` from `tsx` carry an esbuild `__name` helper. The harness defines it in test pages; game code is untouched.

## Not done, and known limitations

- **No WebKit or real-device runs.** Playwright's WebKit isn't installed in this environment, and every iPhone browser uses WebKit.
- **Gesture model A** (the feed owns vertical swipes, so games use taps or horizontal drags only) isn't built; only model B is.
- **Scores and saves are per device** (localStorage). There's no backend yet, so leaderboards show only you.
- **Challenge links aren't fair yet.** The recipient gets a seed, but the sender's run used a different one, so the levels differ (the daily crossword is unaffected). Fix: the host issues each run's seed.
- **Posters are stills.** Short preview clips come later.
- **Untested:** audio, and long tasks.
- **The headless VM has no time limit on each step**, so a rules loop that never ends would hang the check.
- **The per-game player ID is derived from a device ID in the browser.** In production the key lives on the server.
- **Local hosting only.** Trying it on a phone needs a public deploy with wildcard subdomains for the per-game origins. That needs a domain; it's an open question.
