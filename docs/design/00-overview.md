# Design overview

Status: first draft, 2026-11-11. Everything here is a proposal until it is recorded as decided in `../decisions.md`.

Working name: Vibe (carried over from v0; the final name is open).

## The product in one paragraph

A vertical feed of small games. Each game plays the moment it scrolls into view, with no install and no menu. Anyone can make a game by describing it to an AI agent, usually starting from a template, and anyone can remix any game. Under the games sits a shared platform: identity, saves, leaderboards, challenges, analytics, and later real-time multiplayer. That platform is what makes a two-minute game feel like part of a social product instead of a toy on its own.

## What has to be true

The product works only if all of these hold. They are ordered by how likely each is to be false, which is also the order in which to test them.

| # | Bet | Why it might be false | Cheapest test |
|---|---|---|---|
| B1 | AI-made games can be fun enough, often enough, that people keep swiping. | A bad game costs more attention than a bad video: you have to work out what to do before you can judge it. Feeds of AI-generated media have so far struggled to hold people. | Generate about 50 games from 3 templates, put them in a bare feed, and watch 20–50 real people. Measure focused play time per game, swipe-away within 3 seconds, and whether they come back the next day. |
| B2 | Someone who can't code gets a game they're proud of in under about 5 minutes. | Agents fail in ways non-coders can't diagnose. Most first ideas ("like Minecraft but…") are far beyond a feed game. | A creation prototype on the same templates. Measure the share of sessions that reach a working game, time to first playable build, and whether people publish. |
| B3 | A feed of live games performs on mid-range phones. | WebGL context limits, memory, start-up time, audio unlock, and swipe gestures that clash with in-game gestures. | A runtime spike on real devices (one cheap Android phone, one iPhone): three live game frames and swipe navigation. |
| B4 | Each game costs little enough to make that a free tier is viable. | Agent turns with playtests and image generation could cost dollars per game. | Instrument cost per turn and per published game in the B2 prototype. |
| B5 | We can keep the feed safe and legal at a cost we can afford. | UGC with a likely teenage audience, clones of famous games, and app store rules. | Policy research (in progress), and red-team the checks pipeline during the alpha. |

B1 is the existential question. Nothing else, social features and multiplayer included, should be built until we have evidence on it.

## Design principles

1. **The game contract is the spine.** A game is a package (bundle + manifest + pinned engine and SDK versions) that a host runs. The host, SDK, templates, agent and checks are all built against that contract, and it changes rarely and only in versioned steps.
2. **Every game is hostile code.** It runs isolated on its own origin, and its only way out is messages to the host, which checks each one. A game never holds anything worth stealing.
3. **Templates beat blank pages.** The agent edits a game that already works and already feels good, instead of writing one from nothing. Templates carry the genre knowledge: controls, game feel ("juice"), a difficulty curve, a fail state and an instant restart.
4. **Trust what the host measures.** Ranking and analytics rest on what the host observes (focus, input, time, exits). What a game reports about itself is for display and for creators' dashboards.
5. **Never break a published game.** Engine and SDK versions are pinned per game and served forever. New platform features arrive as new SDK versions.
6. **Limit the blast radius.** A new game reaches its creator, then people they share it with, then a small exploration pool, and only then the main feed, with checks and real player signals at each step.
7. **The checks double as the agent's eval suite.** The checks that gate publishing also score the agent offline, so a change to a prompt, template or model is measured before it ships.

## System map

```
                    ┌────────────────────────── app.<domain> (trusted) ──────────────────────────┐
 Player ──────────▶ │ Feed / Player UI ── Host runtime ──postMessage──▶ iframe: <gameId>.<games-domain> │
                    │        │                 │  (checks every call)          (untrusted game)       │
                    │        │                 └──────▶ Platform API: identity, saves, scores,       │
                    │        │                                 challenges, events                    │
 Creator ─────────▶ │ Studio UI (same host runtime for previews)                                      │
                    └────────┬─────────────────────────────────────────────────────────────────────────┘
                             │ chat turns
                             ▼
                    Creation service (agent loop, durable turns)
                             │ tools: edit files · build · playtest · screenshot · generate image/sound
                             ▼
                    Sandbox (esbuild + headless Chromium and WebKit)
                             │ publish
                             ▼
                    Checks pipeline ──▶ immutable bundle store ──▶ game CDN (*.<games-domain>, strict CSP)
                             │
 Host events ──▶ ingest ──▶ analytics + ranking aggregates ──▶ feed candidates and ranking
```

Detailed design:

- `01-game-runtime.md`: the game contract, isolation, the host–game protocol, the SDK, and the feed runtime.
- `02-creation.md`: templates, the creation agent, the build and playtest harness, evals, and remix.
- `03-checks-and-safety.md`: quality and safety checks, distribution tiers, moderation and compliance.
- `04-platform-services.md`: identity, saves, leaderboards, async social play, multiplayer, analytics, ranking, data model and stack.

## Phases

The phases are ordered but not dated. Dates come once the spikes have told us what is hard.

**Phase 0: spikes, aimed at B1–B4**
1. *Runtime spike:* a minimal host plus three hand-made game frames in a swipe feed, on real phones. Measures load time, memory, audio and gesture handling.
2. *Template + agent spike:* two or three templates and an agent with edit, build and playtest tools. Generate about 50 games from a fixed prompt set, then score them with the checks and by hand.
3. *Playtest harness spike:* boot, input-response and playthrough checks in headless Chromium and WebKit, with a video recording of each run.
4. *Fun test (B1):* the 50 games in a bare feed for 20–50 people.

**Phase 1: closed alpha (invite only)**

Web app, guest play and sign-in, 3–5 templates, creation agent, publish checks, simple feed ranking, likes and shares, saves, leaderboards, challenge links, and host-measured analytics. No real-time multiplayer, comments or DMs.

**Phase 2: social**

Follows, remix with lineage, ghost replays and daily seeds, notifications, creator dashboard, native shell (iOS and Android) and moderation tooling.

**Phase 3: if the data supports it**

Real-time multiplayer for selected templates, creator monetisation, and a learned ranking model.

## Open questions only the founders can answer

1. **Minimum age** (13+, 16+ or 18+). This drives moderation strictness, UK Online Safety Act duties, COPPA exposure and app store ratings. It is the single biggest scope lever in safety.
2. **Who pays for generation.** Free with quotas, subscription, or credits. This shapes rate limits and the free tier from day one.
3. **Launch geography.** UK, US, EU, or all of them.
4. **Team.** Size and skills. This changes how much managed infrastructure we should buy instead of build.
5. **Name and brand.** Needed before the game domain is registered, because the user-content domain should match the brand.
