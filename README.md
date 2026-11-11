# Vibe (working name)

A social app whose feed is made of small games. Each game plays as soon as it scrolls into view. Anyone can make one by describing it to an AI agent, usually starting from a template, and anyone can remix any game.

This repo holds the design and the first working slice: the feed, the game sandbox, three templates and the playtest harness.

## Run it

Needs Node 22+ and pnpm 10.

```bash
pnpm install
pnpm dev            # build everything, then serve on port 4100
```

Open **http://app.localhost:4100/** in Chrome or Firefox. Both resolve `*.localhost` to your machine. Use a narrow window or device emulation; the feed is built for phones.

Other commands:

```bash
pnpm check          # build, then run every game through the playtest harness (also makes the feed posters)
pnpm check hop      # just one game
pnpm test           # unit tests: crossword rules and puzzle pack, edge security rules, protocol
pnpm typecheck
pnpm new-game hop cat-hop "Cat Hop"     # copy a template into games/ to make a new game
pnpm tsx templates/mini-crossword/tools/fill.ts 20   # generate crossword grids
pnpm tsx templates/flipside/tools/make.ts 15         # generate Flipside puzzles
```

## What's here

```
apps/web/            the feed (index.html) and single-game page (play.html)
apps/edge/           local server: app, engine CDN and per-game origins, with security headers
packages/protocol/   the game contract: manifest and host–game message schemas
packages/sdk/        `window.vibe`, the game-side SDK (3.4 KB), served from the engine CDN
packages/host/       runs one game in a sandboxed iframe and checks every message it sends
packages/build/      bundles a game into an immutable, content-hashed version
packages/checks/     playtest harness: headless rule checks + browser checks
packages/wordkit/    word tools for word-game templates: common-word lexicon and grid filler
templates/           hop (one-tap runner), dodge (drag to dodge), mini-crossword (daily 5×5),
                     flipside (daily word puzzle: flip two-sided tiles so every entry is a word)
games/               games made from templates (empty for now)
tests/               unit tests
docs/                design, decisions, findings
```

## Hosted test build

- Feed: https://vibe-feed-app-seven.vercel.app (Vercel login required)
- Games: https://vibe-feed-games.vercel.app (public; game pages only load inside the feed)

Both are Vercel projects built from this branch (`pnpm build && pnpm export app|games`, with `APP_ORIGIN` and `GAMES_ORIGIN` set). Games share one origin there; per-game subdomains need our own domain (decision D32).

## Read next

1. [`docs/design/00-overview.md`](docs/design/00-overview.md): what has to be true, principles, phases, open questions
2. [`docs/spikes/01-feed-runtime-templates.md`](docs/spikes/01-feed-runtime-templates.md): what step 1 built and what it found
3. [`docs/design/01-game-runtime.md`](docs/design/01-game-runtime.md) to [`04-platform-services.md`](docs/design/04-platform-services.md): detailed design
4. [`docs/decisions.md`](docs/decisions.md): the decision log
5. Each template's `TEMPLATE.md`: how to make a new game from it
