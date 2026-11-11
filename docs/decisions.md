# Decision log

Status values: **Decided** (agreed with the founders), **Proposed** (recommended, awaiting agreement or evidence), **Open** (needs an answer).

| # | Date | Decision | Status | Alternatives considered | Why |
|---|---|---|---|---|---|
| D1 | 2026-11-11 | Drop the v0 code; keep selected ideas (see `legacy-v0-review.md`) | Decided | Build on v0 | v0 was a three-day scaffold with unwired core features, silent bugs, and a runtime design that would lock games to app binary versions |
| D2 | 2026-11-11 | Remove gstack from the project's tooling and plans | Decided | Install it in the cloud environment | Founder decision |
| D3 | 2026-11-11 | Games only | Proposed | Any app type (v0) | Narrower quality bar; templates and checks can be genre-specific |
| D4 | 2026-11-11 | Web first, native shell in Phase 2 | Proposed | Mobile only (v0); native first | Every game is a link anyone can open; faster iteration. Risk: retention and push notifications live in native apps, so the shell should follow soon after the alpha |
| D5 | 2026-11-11 | A game is a versioned package (bundle + manifest + pinned engine and SDK versions) run by a host | Proposed | Single HTML file with inline libraries; libraries bundled into the app (v0) | Published games never break; the host can enforce permissions |
| D6 | 2026-11-11 | Each game on its own subdomain of a separate user-content domain, in a sandboxed iframe with strict CSP; all platform access through the host | Proposed | Same-domain iframes; injecting the SDK into a WebView (v0) | Untrusted code never shares an origin or context with the app or other games |
| D7 | 2026-11-11 | Games receive a per-game player ID, never the account ID | Proposed | Global user ID (v0) | Stops games linking players across games; nothing valuable can leak |
| D8 | 2026-11-11 | Creation is one agent loop with tools, working inside templates | Proposed | Fixed five-stage pipeline with a regex router (v0) | The agent can build, playtest, look and fix; templates carry the genre knowledge |
| D9 | 2026-11-11 | Agent behind our own interface; spike on libfx (fx0 as reference), compare with the AI SDK on the same evals | Proposed | Commit to one runtime now | libfx and fx0 are experimental; the interface keeps switching cheap |
| D10 | 2026-11-11 | Playtest harness shared by the agent, the publish checks and the offline evals | Proposed | Separate validator (v0) | One definition of "works"; agent quality becomes measurable |
| D11 | 2026-11-11 | Asynchronous social play (leaderboards, challenge links, daily seeds, ghosts) before real-time multiplayer | Proposed | Real-time multiplayer as a V1 priority (v0) | Fits short feed sessions; cheaper; harder to cheat; less moderation exposure |
| D12 | 2026-11-11 | If real-time multiplayer comes, use a reducer model (setup + actions + tick) | Proposed | Shared key-value state with last-write-wins (v0); free-form message relay | Testable headlessly, agent-friendly, and can run as an authoritative server |
| D13 | 2026-11-11 | Ranking and creator metrics use host-measured signals; game-reported events are for display | Proposed | Trust game events | Games are untrusted code |
| D14 | 2026-11-11 | Distribution tiers: private, followers, exploration, main feed | Proposed | Publish straight to the main feed | Limits damage from anything the checks miss; gives every new game a fair test |
| D15 | 2026-11-11 | TypeScript monorepo; Next.js on Vercel, Postgres (Neon), Redis (Upstash), R2 with an edge worker for games, an AI gateway for models | Proposed | Rails + React Native + Firebase + Bedrock (v0) | One language across games, SDK, host, agent and checks |
| D16 | 2026-11-11 | Feed gestures: two modes (attract in the feed, focus after the first tap), relaxed for games declaring no vertical gestures | Proposed, to prototype | Feed owns vertical swipes; edge rail | Most flexible for game design; validate on devices |
| D17 | — | Minimum age | Open | 13+, 16+, 18+ | Drives moderation, the UK Online Safety Act, COPPA and store ratings |
| D18 | — | Who pays for generation | Open | Free with quotas; subscription; credits | Shapes quotas and unit economics |
| D19 | — | Launch geography | Open | UK, US, EU | Determines which regulations apply first |
