# Platform services: identity, saves, social play, multiplayer, analytics, ranking, data, stack

Status: first draft.

## 1. Identity

- **Guests first.** Anyone can play from a link with no account. A guest gets a device-scoped ID, and saves and scores attach to it. Signing up merges the guest's history into the account.
- **Sign-in** with passkeys plus Apple and Google. A sign-up prompt appears after two or three games, or when someone tries to create, follow or appear on a friends leaderboard.
- **What games see:** a per-game player ID (an HMAC of the user ID and game ID), display name, avatar URL, and whether the player is a guest. Two games cannot link the same person through the ID they receive.

## 2. Saves

- A key-value store per (game, player), at most 64 KB in total. The host caches reads and writes them back with a version counter. Last write wins, which is enough when one player saves their own progress.
- Saves belong to the game and carry across its versions. A creator's edit can change what the game expects to find, so templates include a `saveVersion` field and a migration step, and the agent is told to keep it working.
- Saves are not kept in the game's own `localStorage`. Storage in cross-site iframes is partitioned and can be evicted **[verify]**, so the host is the source of truth.

## 3. Leaderboards and asynchronous social play

Feed sessions are short and friends are rarely playing at the same moment, so social play that doesn't need everyone online at once comes first. It is cheaper than real-time multiplayer, and it fits how people use a feed.

- **Leaderboards:** global, friends and today, per game. A board belongs to a game, and a creator can reset it when publishing a version that changes difficulty.
- **Challenge links:** after `end()`, "Beat my 42" shares a link. The recipient opens the game with `vibe.context.challenge` set (the challenger, their score and the seed), so both play the same level.
- **Daily seed:** every game can have a "today's run" that everyone plays with the same seed, with its own board. It gives people a reason to come back daily.
- **Ghost replays** (Phase 2): for deterministic templates, store the seed and input log of good runs and replay them as a translucent ghost. The same logs let us verify scores (see `03-checks-and-safety.md` §5).

## 4. Real-time multiplayer (Phase 3, only if the data supports it)

v0 listed multiplayer as its second priority, and never built it. This design defers it, for these reasons:

1. **It doesn't fit the feed.** A feed session lasts seconds to minutes. Real-time play needs co-present players, a lobby and waiting.
2. **It is the hardest primitive for an agent to use correctly.** Shared mutable state with last-write-wins (v0's model) desyncs and is trivially cheated.
3. **It is expensive to run and to moderate.** Player-to-player interaction raises child-safety stakes.

When we do build it, the model should be a **reducer**:

```ts
export default defineRoom({
  setup(players, seed) { return initialState },
  actions: {
    move(state, { dx }, { playerId }) { /* mutate a draft of state */ },
  },
  tick(state, dt) { /* optional fixed-step update */ },
  isOver(state) { return winnerOrNull },
});
```

The logic is a pure function of state and actions. That has three consequences:

- It can be tested headlessly, so the playtest harness can fuzz it with random actions.
- It is the easiest model for an agent to write correctly.
- It can run on a server as the authority, with clients predicting locally, which makes cheating hard.

Rune's SDK is reported to use a similar model **[verify]**.

Hosting options: one Cloudflare Durable Object per room, running the game's logic module in an isolate **[verify product status and limits]**, or a Node room server running logic in `isolated-vm`. A cheaper first step for friends-only party games is host-authoritative play, where one player's client runs the reducer. It is easy to cheat, which matters little among friends.

## 5. Analytics

Two streams, with different levels of trust:

| Stream | Examples | Trust | Used for |
|---|---|---|---|
| Host-measured | impression, focus start and end, time to first input, focused play time (foreground only), exit reason (swipe, close, end), replay, like, share, remix, challenge sent and accepted | Trusted | Ranking, platform metrics, creator dashboards |
| Game-reported via `vibe.events.track` and `vibe.end` | `level_start`, `level_end`, `end` with an outcome, custom events | Untrusted, rate-limited | Creator dashboards and funnels; not used for ranking, except that `end` counts as completion when the timing is plausible |

- Standard event names come from a fixed vocabulary, so every game gets funnels without setup. Custom events are namespaced `custom.*` and capped per game.
- Pipeline: the host batches events to an ingest endpoint, then a queue, then (a) a product analytics tool (PostHog fits, and is already connected in our tooling) and (b) our own aggregates table for ranking and creator dashboards. Ranking must not depend on a third-party tool's availability.
- Creator dashboard: plays, median focused play time, completion rate, replay rate, bounce rate, challenge rate, and day-1 return.

## 6. Feed ranking (starting point, from v0's doc 11, simplified)

- **Candidate pools:** following, exploration (new games with guaranteed impressions), proven (games that did well in exploration), and challenges sent to the user.
- **Score:** a prior (from the quality rating and the creator's track record), times engagement (median focused play time relative to the template's norm, replay rate, the inverse of the under-3-second swipe-away rate, and likes, shares, remixes and challenges per play), times freshness. Diversity rules cap repeats of the same template or creator in a row.
- **Exploration:** each new game that passes its checks gets at least N impressions in the exploration pool, so every creator gets a fair test.
- **Later:** a learned model, once there are enough impressions to train one.

## 7. Data model (sketch, Postgres)

```
users(id, handle, display_name, avatar_url, birth_year?, created_at, status)
guest_identities(id, device_key, merged_into_user_id?)
games(id, creator_id, title, status, visibility, tier, current_version_id,
      template_id, template_version, remix_of_version_id, root_game_id, created_at)
game_versions(id, game_id, source_ref, bundle_ref, manifest jsonb, engine, sdk,
              created_by_turn_id, check_run_id, created_at)              -- immutable
creation_sessions(id, game_id, user_id, created_at)
turns(id, session_id, user_message, status, steps, cost_usd, started_at, finished_at, transcript_ref)
check_runs(id, version_id, verdict, results jsonb, artefacts_ref, created_at)
saves(game_id, player_key, data jsonb, version, updated_at)               -- player_key = user or guest
scores(id, game_id, board, player_key, value, version_id, seed, input_log_ref?, verified, created_at)
challenges(id, game_id, from_player_key, score, seed, created_at)
likes(user_id, game_id), follows(follower_id, followee_id)
reports(id, game_id, version_id, reporter_key, reason, status, created_at)
moderation_actions(id, target_type, target_id, action, reason, actor, created_at)
game_stats_daily(game_id, day, impressions, focus_starts, median_play_ms, completions, replays,
                 bounces, likes, shares, remixes, challenges)              -- built from host events
```

## 8. Stack (proposal)

TypeScript end to end. The games, SDK, host, agent tools and checks are all JavaScript already, and v0's mix of four ecosystems is not worth repeating.

```
apps/
  web/            Next.js: feed, player host, studio, profiles, API routes
  games-edge/     edge worker serving *.<games-domain> with security headers and the kill switch
packages/
  protocol/       zod schemas for host–game messages (shared)
  sdk/            the game-side SDK: tiny, dependency-free, versioned, served from the engine CDN
  host/           frame manager, bridge, gesture and lifecycle policy, rate limits
  templates/      starter games, each with TEMPLATE.md and playtest.ts
  checks/         Playwright playtest harness and publish checks
  agent/          the CreationAgent interface and its implementation
services/
  creation/       durable agent turns (queue-driven), calling the sandbox for builds and playtests
```

| Need | Proposal | Notes |
|---|---|---|
| Web app and API | Next.js on Vercel | Fits fx0's reference architecture |
| Durable agent turns | Vercel Workflow + Queues (as fx0 uses), or Inngest | Choose in the agent spike |
| Builds and playtests | Vercel Sandbox if Playwright with Chromium and WebKit runs well there, otherwise a container pool | Verify in the harness spike |
| Database | Postgres (Neon) | |
| Cache, rate limits, live turn streams | Redis (Upstash) | |
| Bundles and assets | Object storage (Cloudflare R2), served by an edge worker on the games domain | Wildcard subdomains, custom headers and an instant kill switch |
| Models | Through a gateway (Vercel AI Gateway) | Lets us route by turn type and swap providers |
| Product analytics | PostHog | Plus our own aggregates for ranking |
| Native shell (Phase 2) | Expo app wrapping the web app | Push notifications, haptics, share sheet, store presence |
