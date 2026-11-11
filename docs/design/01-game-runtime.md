# Game runtime: contract, isolation, protocol, SDK, feed

Status: first draft. Items marked **[verify]** depend on research that is still running or on device testing.

## 1. The game contract

### Package

The creator-facing source is a small project that the agent edits:

```
game.json          manifest (below)
index.html         shell; loads engine + SDK from the engine CDN, then src/main
src/               game code (TypeScript or JavaScript)
assets/            generated images and sounds (optional)
TEMPLATE.md        carried over from the template: where the knobs are, for the agent
playtest.ts        carried over from the template: how a bot plays this game
```

A build (esbuild, in the sandbox) turns this into an immutable **bundle**: `index.html`, one hashed JS file and the assets. Bundles are stored at `bundles/{gameId}/{versionId}/` and never change.

### Manifest

```jsonc
{
  "contract": 1,                                        // version of this contract
  "sdk": "1.0.0",                                       // exact SDK version, pinned
  "engine": { "name": "phaser", "version": "3.90.0" },  // exact engine version, pinned (example value)
  "orientation": "portrait",
  "input": ["tap", "drag"],                             // gestures the game uses; drives the host's gesture policy
  "capabilities": ["saves", "scores"],                  // SDK features the game may call; the host refuses others
  "audio": true,
  "title": "…",
  "description": "…",
  "template": { "id": "one-tap-runner", "version": "4" },
  "remixOf": { "gameId": "…", "versionId": "…" }        // absent if original
}
```

Declared capabilities matter twice. The host enables only those, and the checks fail a game that calls anything undeclared. That keeps the permission surface visible in one place.

### Budgets (initial guesses, to be tuned in the runtime spike)

| Budget | Initial value | Why |
|---|---|---|
| Bundle size excluding engine | ≤ 1.5 MB, with first load ≤ 500 KB | Feed swipes must feel instant on mobile data |
| Time to `ready()` on a mid-range Android | ≤ 1.5 s from frame creation | Same |
| JS heap after 60 s of play | ≤ 150 MB | Several frames can be alive at once |
| Main-thread long tasks | none > 200 ms after ready | Jank reads as "broken" |

### Engine and SDK pinning

Engines and SDK builds are served from `engine.<games-domain>/<name>/<version>/…` with long-lived immutable caching and Subresource Integrity hashes. Old versions are never removed. Templates move to new engine versions; existing games stay where they are unless their creator re-publishes. This fixes v0's design, where the libraries were bundled into the app binary.

The default engine is **Phaser 3**: mature, with physics, tweens, particles and input, and well represented in model training data. Pick the exact version after **[verify]** confirms Phaser 4's status. Other engines (Three.js for 3D, or none for DOM/canvas games) come in as separate templates, and each template uses exactly one engine.

## 2. Isolation

Two registrable domains, never shared:

- `app.<domain>`: the trusted app (feed, studio, accounts, API).
- `<games-domain>`: user content only. Every game is served at `https://<gameId>.<games-domain>/v/<versionId>/` by a small edge worker in front of the bundle store, which sets security headers.

Precedent: Discord Activities serve each activity from its own `<application_id>.discordsays.com` subdomain behind a proxy **[verify]**. GitHub Pages, Google's googleusercontent.com and CodeSandbox follow the same pattern of user content on a separate registrable domain.

### Iframe

```html
<iframe
  src="https://<gameId>.<games-domain>/v/<versionId>/"
  sandbox="allow-scripts allow-same-origin"
  allow="autoplay; fullscreen; gamepad"
  referrerpolicy="no-referrer"
  loading="eager">
</iframe>
```

- `allow-same-origin` only gives the game its own origin, because that origin is a different site from the app. It never gives access to the app. It is included so engines that touch `localStorage` don't throw. Whether to drop it in favour of fully opaque origins depends on the cache-sharing question in the caching section below **[verify]**.
- Left out deliberately: `allow-top-navigation*`, `allow-popups`, `allow-modals` (an `alert()` would freeze the feed), `allow-forms`, camera, microphone, geolocation and payment.

### Headers on game documents

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self' https://engine.<games-domain> 'unsafe-inline' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  media-src 'self' data: blob:;
  font-src 'self' data:;
  connect-src 'self';
  worker-src 'self' blob:;
  frame-src 'none'; form-action 'none'; base-uri 'none';
  frame-ancestors https://app.<domain> <native-shell-origins>
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), …
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
```

`connect-src 'self'` lets the engine's loader fetch the game's own assets. The game origin serves only that game's static files, so this does not open a channel to anything else. `frame-ancestors` stops other sites embedding games outside our host.

### What isolation does not cover

CSP is one layer of defence, and it has known gaps. WebRTC can reach out despite `connect-src`, and DNS prefetch can leak a little. The design therefore makes sure a game never has anything worth leaking:

- Games get a **per-game player ID** (an HMAC of the user ID and game ID), a display name and an avatar URL. Never the account ID, email, tokens or other games' data.
- Saves, scores and events go through the host, which knows who the user is. The game never does.
- The host rate-limits and size-limits every message type, and validates every payload against a schema.

## 3. Host–game protocol

- **Handshake.** The SDK in the game posts `{type: "hello", sdk, contract}` to `window.parent`. The host checks that `event.source` is the iframe's `contentWindow` and that `event.origin` is the game's expected origin. It replies by transferring one end of a `MessageChannel`, together with the init payload: the player, the feed context (feed, challenge, studio preview), the safe area and the locale. From then on, all traffic uses that private port, so several frames in a feed can never mix messages.
- **Envelope.** `{v: 1, id?: string, type: string, payload: unknown}`. Requests carry an `id` and receive `{v, id, ok: true, result}` or `{v, id, ok: false, error: {code, message}}`. Events carry no `id`.
- **Validation.** Schemas live in `packages/protocol` (zod), shared by SDK and host. The host rejects unknown types, oversized payloads (64 KB per message by default) and over-rate calls, and logs violations against the game version. Violations feed into its quality signals.
- **Timeouts.** SDK requests time out after 10 s and reject with a typed error. Templates show how to degrade, for example by continuing without a leaderboard.

## 4. SDK v1 (game side)

Kept deliberately small. Every method is something a model has to use correctly, so each addition costs reliability. Real-time multiplayer is not in v1.

```ts
// Lifecycle (required in every game)
vibe.loading(progress: number): void            // 0..1, drives the host's loading UI
await vibe.ready(): Promise<Init>               // game can accept input; host starts timers
vibe.onPause(cb): void                          // host: scrolled away, app backgrounded, overlay opened
vibe.onResume(cb): void
vibe.end(result: { outcome: "win" | "lose" | "complete" | "quit"; score?: number }): void
                                                // one run finished; enables replay, challenge and completion metrics

// Identity (read-only, from Init)
vibe.player   // { id: string /* per-game */, name: string, avatarUrl: string, guest: boolean }
vibe.context  // { mode: "feed" | "focus" | "studio" | "challenge"; challenge?: { from: PlayerRef; score: number; seed: string } }

// Capabilities (must be declared in game.json)
await vibe.saves.get(key): Promise<Json | null>        // ≤ 64 KB per game per player in total
await vibe.saves.set(key, value): Promise<void>
await vibe.scores.submit(value, opts?: { board?: string }): Promise<{ rank?: number; best: number }>
await vibe.scores.top(opts?: { board?: string; scope?: "global" | "friends" | "today"; limit?: number })
vibe.events.track(name: StandardEvent | `custom.${string}`, props?: Record<string, string | number | boolean>)
vibe.random(seed?: string): () => number               // seeded PRNG; seed comes from the challenge or daily seed when present
vibe.haptic(kind: "light" | "medium" | "heavy" | "success" | "error"): void
vibe.share(opts?: { text?: string; score?: number }): void   // host shows its own share sheet with a challenge link
```

Notes:

- `vibe.ready()` and `vibe.onPause()` are required in every game. Templates include them. The checks verify `ready` arrives in time and that rendering and audio actually stop after a pause.
- `vibe.random()` is there so challenges, daily seeds and ghost replays can reproduce a run. Templates use it for all gameplay randomness.
- There is no `vibe.exit()`, and no network, chat or free-text input. The host owns navigation, social UI and anything a user types.
- Leaderboard UI can be rendered by the host as an overlay after `end()`, so games don't each build one and personal data stays out of the game.

## 5. Feed runtime

### Frame management

- At most three live frames: the current game, the next one (loaded and paused) and the previous one (paused, destroyed after a short delay). All others show a poster, which is a 3–5 s silent clip recorded by the playtest harness, or a still frame.
- The playtest recording doubles as the feed preview, which keeps the feed moving even before a frame loads.
- Frames far from the viewport are destroyed outright, which frees their memory and WebGL contexts. Browsers cap live WebGL contexts and WKWebView is tight on memory **[verify limits]**.
- Caching: if per-game subdomains of the same registrable domain share the HTTP cache under one top-level site, the engine file downloads once and is reused across games. Whether that still holds for opaque-origin iframes, and in Safari, is **[verify]**. The answer decides the `allow-same-origin` choice above, and whether to add `<games-domain>` to the Public Suffix List.

### The gesture conflict

Swiping up to the next game clashes with any game that uses vertical swipes or drags. Options:

| Option | How it works | Cost |
|---|---|---|
| A. Feed owns vertical swipes | Games may only use taps, horizontal swipes and drags inside a bounded area | Rules out some genres; easy to enforce through `input` in the manifest |
| B. Two modes | In the feed, the game runs in attract mode and swipes scroll. A first tap enters focus mode, where the game gets all input and a small "next" control appears. After `end()`, swipe works again | One extra tap; clean rules; the most flexible |
| C. Edge rail | Swipe only from a strip at the screen edge | Easy to miss, and clashes with OS gestures on iOS |

Proposal: **B as the default, relaxed to A for games whose manifest declares no vertical gestures** (those can be swiped past even mid-game). Prototype A and B in the runtime spike and measure accidental swipes and time to first input.

### Audio

Browsers block autoplay with sound until the user interacts, and the activation has to be delegated to cross-origin frames (`allow="autoplay"`). Games start muted in the feed. The first tap, which also enters focus mode, unlocks audio. The host owns a global mute toggle and passes it to games through `onPause` and `onResume`. Behaviour inside WKWebView and Android WebView needs device testing **[verify]**.

## 6. Native shell (Phase 2)

The first native app is a thin shell (Expo) whose WebView loads the web app. Games remain iframes inside it, so the protocol does not change. The shell adds push notifications, haptics, the native share sheet and app store presence. One WebView per game, for stronger process isolation, is a later option that the same protocol supports: the SDK would talk to a native bridge instead of `window.parent`. App store conditions for hosting HTML5 mini games are covered in `03-checks-and-safety.md` **[verify]**.
