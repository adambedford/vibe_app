# Design overview

Status: first draft, 2026-11-11. Everything here is a proposal until it is recorded as decided in `../decisions.md`.

Working name: Vibe (carried over from v0; the final name is open).

## The product in one paragraph

A vertical feed of small games. Each game plays the moment it scrolls into view, with no install and no menu. Anyone can make a game by describing it to an AI agent, usually starting from a template, and anyone can remix any game. Under the games sits a shared platform: identity, saves, leaderboards, challenges, analytics, and later real-time multiplayer. That platform is what makes a two-minute game feel like part of a social product instead of a toy on its own.

## Landscape (November 2026)

Several well-funded teams are building close variants of this product. None has published retention data. Figures marked "self-reported" come from the company's own site. Sources are listed at the end.

| Product | What it is | Status | What it tells us |
|---|---|---|---|
| Meta Pocket (grew out of Gizmo) | A feed of vibe-coded "gizmos" you can play, save, repost and remix; links play without installing | Launched in the US on 20 Aug 2026 after a test in Brazil; no usage published | The closest competitor, with Meta's distribution and its own model |
| Sekai | Mini-app creation and feed | 20M+ mini-apps created; $20M Series A in June 2026 | Getting people to create is the easy part |
| Remix (remix.gg) | Feed of vibe-coded games; moved from Farcaster to its own apps and the app stores | 160K+ games, 55M+ plays (self-reported), about 1 minute per play | Games grew about 200× since July 2025 while plays grew about 3×. Supply outruns demand |
| Wabi | "YouTube for apps" | Pivoted to a messenger with a personal agent in Sept 2026 | Its founder judged a standalone feed weaker than play inside conversation |
| Rune | Multiplayer HTML5 games inside voice-chat rooms | iOS app last updated May 2025; site now pitches AI game creation | Its deterministic multiplayer SDK is the model to copy (see `04-platform-services.md`) |
| Roblox Build, YouTube Playables Builder | Prompt-to-game inside very large platforms | Alpha and closed beta | Incumbents treat this as a feature. Roblox ranks for long-term retention to keep "AI slop" out of discovery |
| Phaser Game Agent (Phaser Studio) | Prompt to game with code, art, sound, tests and a play link, built on Phaser AE, a closed engine designed for AI agents. Also callable from coding agents over MCP | Launched mid-2026; billed by build time, from $0.01 per minute | The makers of our default engine now run a competing creation tool. Making games is becoming a commodity, so the feed and social layer are where we can stand apart. We could also accept games built with other tools, as long as they meet our contract |
| Gambo.ai | AI game builder | Reported shut down May 2026 (secondary source) | Generation is expensive to give away |

What this means for us:

1. **Making lots of games is the easy part.** Ranking for retention, distribution tiers and curation matter more than creation volume. itch.io saw new game pages per day double, mostly from AI, while downloads didn't.
2. **We need a reason to exist next to Meta Pocket.** Candidate answers: games specifically (Pocket covers broader "gizmos"), quality that comes from templates, competing with friends (challenges, daily seeds), and a better loop for creators. This is open question 6.
3. **Play inside group chats may matter more than an isolated feed.** Wabi's pivot points that way, and Rune, Discord and Telegram all tie play to an existing group. Web links that play instantly in any chat app hedge this bet, and challenge links are built for it. Bet B6 tests it.
4. **Rights holders act within days.** Jagex had a viral AI-made RuneScape clone taken down within days in September 2026. IP screening and a takedown process are needed from day one.

## What has to be true

The product works only if all of these hold. They are ordered by how likely each is to be false, which is also the order in which to test them.

| # | Bet | Why it might be false | Cheapest test |
|---|---|---|---|
| B1 | AI-made games can be fun enough, often enough, that people keep swiping. | A bad game costs more attention than a bad video: you have to work out what to do before you can judge it. Remix's plays grew far more slowly than its catalogue, and no competitor has published retention. | Generate about 50 games from 3 templates, put them in a bare feed, and watch 20–50 real people. Measure focused play time per game, swipe-away within 3 seconds, and whether they come back the next day. |
| B2 | Someone who can't code gets a game they're proud of in under about 5 minutes. | Agents fail in ways non-coders can't diagnose. Most first ideas ("like Minecraft but…") are far beyond a feed game. | A creation prototype on the same templates. Measure the share of sessions that reach a working game, time to first playable build, and whether people publish. |
| B3 | A feed of live games performs on mid-range phones. | WebGL context limits, memory, start-up time, audio unlock, and swipe gestures that clash with in-game gestures. | A runtime spike on real devices (one cheap Android phone, one iPhone): three live game frames and swipe navigation. |
| B4 | Each game costs little enough to make that a free tier is viable. | Agent turns with playtests and image generation could cost dollars per game. | Instrument cost per turn and per published game in the B2 prototype. |
| B5 | We can keep the feed safe and legal at a cost we can afford. | UGC with a likely teenage audience, clones of famous games, phishing abuse of user-content hosting, and app store rules. | Policy research (in progress), and red-team the checks pipeline during the alpha. |
| B6 | A feed is the right container for these games. | People may play more when games arrive from friends in a group chat than from strangers in a feed. | In the B1 test, compare games reached through the feed with games reached through challenge links shared in group chats. |

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

1. **Minimum age** (13+, 16+ or 18+). This drives moderation strictness, app store age gating and COPPA exposure. It is the single biggest scope lever in safety. In the UK, a personalised feed means "highly effective" age assurance (facial estimation, ID and similar), whichever minimum we pick, unless we can show children aren't normally able to get in, which itself needs age assurance. The proposed EU KIDS Act would set 15 as the minimum age for accounts on risky social services and would cover game-creation platforms. Details are in `03-checks-and-safety.md` §6.
2. **Who pays for generation.** Free with quotas, subscription, credits, or bring-your-own-model (Websim lets users connect a ChatGPT account, and Remix runs the agent in the creator's own coding tool). This shapes rate limits and the free tier from day one.
3. **Launch geography.** UK, US, EU, or all of them. The UK needs an age assurance vendor at launch. A US-only alpha avoids that, but still needs COPPA-safe age gating.
4. **Team.** Size and skills. This changes how much managed infrastructure we should buy instead of build.
5. **Name and brand.** Needed before the game domain is registered, because the user-content domain should match the brand.
6. **Positioning against Meta Pocket and the others.** Why would someone use this instead of them? The design leans on games specifically, quality from templates, and competition with friends. That bet needs a founder's conviction behind it, and B1 and B6 should test it.

## Sources for the landscape

- Meta Pocket and Gizmo: [TechCrunch, Feb 2026](https://techcrunch.com/2026/02/04/meet-gizmo-a-tiktok-for-interactive-vibe-coded-mini-apps/), [TechCrunch, Aug 2026](https://techcrunch.com/2026/08/20/meta-brings-pocket-an-app-that-lets-you-vibe-code-and-share-games-to-us-users/), [The Next Web](https://thenextweb.com/news/meta-pocket-vibe-coding-app-us-gizmo-atma-sciences)
- Sekai: [GamesBeat](https://gamesbeat.com/from-tiktok-to-mini-apps-how-sekai-wants-to-transform-vibe-coding-into-a-creator-medium/)
- Remix: [remix.gg](https://remix.gg) (self-reported), [Blockworks seed round](https://blockworks.co/news/remix-5m-seed-funding)
- Wabi: [TechCrunch, Nov 2025](https://techcrunch.com/2025/11/05/replika-founder-raises-20m-pre-seed-for-wabi-the-youtube-of-apps), [TechCrunch, Sept 2026](https://techcrunch.com/2026/09/29/ai-powered-app-maker-wabi-pivots-to-a-messaging-experience/)
- Rune: [rune.ai](https://rune.ai), [App Store listing](https://apps.apple.com/app/1450358364)
- Roblox Build: [TechCrunch, Jul 2026](https://techcrunch.com/2026/07/16/roblox-launches-an-ai-powered-game-creation-feature-in-its-mobile-app/)
- YouTube Playables Builder: [9to5Google](https://9to5google.com/2025/12/23/youtube-playables-builder/)
- Phaser Game Agent and Phaser AE: [Phaser news](https://phaser.io/news/2026/06/phaser-game-agent), [how it was built](https://phaser.io/news/2026/06/how-we-built-the-phaser-game-agent-with-claude-managed-agents-and-superserve), [MCP setup and pricing](https://phaser.io/news/2026/07/phaser-game-agent-mcp-setup), [engine licence](https://phaser.io/polyform-shield-license)
- Gambo.ai closure (secondary source): [aiidelist](https://aiidelist.com/blog/why-gambo-ai-shut-down)
- itch.io supply growth: [Aftermath](https://aftermath.site/itch-ai-games-pc-slop/)
- RuneScape clone takedown: [Dexerto](https://www.dexerto.com/gaming/viral-ai-made-runescape-clone-shut-down-after-jagex-demands-takedown-3408509/)
