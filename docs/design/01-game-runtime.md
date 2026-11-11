# Game runtime: contract, isolation, protocol, SDK, feed

Status: first draft, updated with research findings on 2026-11-11. Items marked **[device test]** need testing on real phones.

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

These are far stricter than web game portals: Poki asks for an initial download under about 5–8 MB, and YouTube Playables allows up to 30 MiB. A feed swipe is less forgiving than a click on a portal. Poki's own data says each extra megabyte loses a couple of percent of players ([Poki blog](https://poki.com/blog/building-web-browser-games-2026)).

### Engine and SDK pinning

Engines and SDK builds are served from `engine.<games-domain>/<name>/<version>/…` with long-lived immutable caching and Subresource Integrity hashes. Old versions are never removed. Templates move to new engine versions; existing games stay where they are unless their creator re-publishes. This fixes v0's design, where the libraries were bundled into the app binary.

The default engine is **Phaser**: mature, with physics, tweens, particles and input, and well represented in model training data. Phaser 4 went stable on 10 April 2026, and the current release is 4.2.1 ([Phaser](https://phaser.io/download/stable)). Models have seen far more Phaser 3 code, so they may write v3 idioms against v4. Since versions are pinned per template, the agent spike should run the same prompts against a Phaser 3.90 template and a Phaser 4.2 template and pick the one with fewer errors. Phaser 4 is the default unless it is clearly worse. The only comparison of engines for AI-written code we found is Phaser's own blog, which is not independent. Other engines (Three.js for 3D, or none for DOM/canvas games) come in as separate templates, and each template uses exactly one engine.

## 2. Isolation

Two registrable domains, never shared:

- `app.<domain>`: the trusted app (feed, studio, accounts, API).
- `<games-domain>`: user content only. Every game is served at `https://<gameId>.<games-domain>/v/<versionId>/` by a small edge worker in front of the bundle store, which sets security headers.

Precedent: Discord Activities run each activity in an iframe at `<app_id>.discordsays.com`, behind a proxy with a CSP that blocks any URL the developer hasn't mapped ([Discord docs](https://docs.discord.com/developers/activities/development-guides/networking)). YouTube Playables forbid external network calls entirely. GitHub Pages, googleusercontent.com and CodeSandbox all keep user content on a separate registrable domain.

**Game URLs only work inside our host.** User-content hosts get abused for phishing; Proofpoint found tens of thousands of malicious URLs on one vibe-coding host. The games edge worker therefore serves a game document only when the request comes from an iframe (`Sec-Fetch-Dest: iframe`). A direct visit redirects to the game's page in the app, so nobody can send a victim straight to a game URL. `frame-ancestors` stops other sites embedding games, and the sandbox and CSP block forms and outbound requests, so a fake login screen inside a game has nowhere to send what it collects.

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

- `allow-same-origin` only gives the game its own origin, because that origin is a different site from the app. It never gives access to the app. It is kept for two reasons. First, Chrome does not cache anything for iframes with opaque origins (a sandbox without `allow-same-origin`), so every game would download the engine again ([Chromium `http_cache.cc`](https://chromium.googlesource.com/chromium/src/+/HEAD/net/http/http_cache.cc)). Second, engines that touch `localStorage` throw a SecurityError in opaque frames.
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

- Games get a **per-game player ID** (an HMAC of the user ID and game ID) and a guest flag. They do not get the account ID, display name, avatar, email, tokens or other games' data. Anything showing a person's name, such as leaderboards or challenger cards, is drawn by the host as an overlay. This also keeps us inside Apple guideline 4.7.3, which forbids sharing data with mini games without the user's consent each time.
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
vibe.firstFrame(): void                         // something is drawn; the host can swap the poster for the live frame
await vibe.ready(): Promise<Init>               // game can accept input; host starts timers
vibe.onPause(cb): void                          // host: scrolled away, app backgrounded, overlay opened
vibe.onResume(cb): void
vibe.onAudio(cb: (enabled: boolean) => void)   // the host owns mute; games must obey
vibe.start(): void                              // a run began (first input after ready, or restart)
vibe.end(result: { outcome: "win" | "lose" | "complete" | "quit"; score?: number }): void
                                                // a run finished; enables replay, challenge and completion metrics

// Identity (read-only, from Init)
vibe.player   // { id: string /* per-game */, guest: boolean }
vibe.context  // { mode: "feed" | "focus" | "studio" | "challenge"; challenge?: { score: number; seed: string } }
              // the host shows who sent the challenge; the game only needs the target and the seed

// Capabilities (must be declared in game.json)
await vibe.saves.get(key): Promise<Json | null>        // ≤ 64 KB per game per player in total
await vibe.saves.set(key, value): Promise<void>
await vibe.scores.submit(value, opts?: { board?: string }): Promise<{ rank?: number; best: number }>
await vibe.scores.top(opts?: { board?: string; scope?: "global" | "friends" | "today"; limit?: number })
                                                       // ranks and scores only; marks the player's own entry
vibe.scores.show(opts?: { board?: string }): void      // host overlay with names and avatars
vibe.events.track(name: StandardEvent | `custom.${string}`, props?: Record<string, string | number | boolean>)
vibe.random(seed?: string): () => number               // seeded PRNG; seed comes from the challenge or daily seed when present
vibe.share(opts?: { text?: string; score?: number }): void   // host shows its own share sheet with a challenge link
```

Notes:

- The lifecycle calls are required in every game, and the checks enforce them: a game that misses one isn't eligible for the feed. The comparable platforms have converged on the same set: separate "first frame" and "ready" signals, gameplay start and stop, pause and resume, mute controlled by the host, and a game-over or score call. YouTube Playables never shows a game that doesn't call `firstFrameReady()`, and Remix refuses to launch a game without its game-over, play-again and mute hooks ([YouTube Playables SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk), [Remix SDK](https://cdn.jsdelivr.net/npm/@remix-gg/sdk@0.6.0/README.md)). YouTube also warns that a paused game may never be resumed, so games should save on pause.
- Saves of up to 64 KB are small next to CrazyGames (1 MB) and YouTube Playables (3 MiB). Feed games need very little state, and the limit can grow later without breaking anything.
- `vibe.random()` is there so challenges, daily seeds and ghost replays can reproduce a run. Templates use it for all gameplay randomness.
- There is no `vibe.exit()`, and no network, chat or free-text input. The host owns navigation, social UI and anything a user types.
- The host draws leaderboards with names (`scores.show()`), so games don't each build one and personal data stays out of the game.
- Haptics are left out of v1. On the web, iOS doesn't support the Vibration API. In the native shell, Apple guideline 4.7.2 forbids exposing native APIs to mini games without Apple's permission. Ask Apple before adding them.

## 5. Feed runtime

### Frame management

- At most three live frames: the current game, the next one (loaded and paused) and the previous one (paused, destroyed after a short delay). All others show a poster, which is a 3–5 s silent clip recorded by the playtest harness, or a still frame.
- The playtest recording doubles as the feed preview, which keeps the feed moving even before a frame loads.
- Frames far from the viewport are destroyed outright, which frees their memory and WebGL contexts. The limits are tight:
  - Chromium allows 16 live WebGL contexts per renderer process on desktop and **8 on Android, including Android WebView**. Going over the limit silently kills the oldest context ([Chromium source](https://chromium.googlesource.com/chromium/src/+/HEAD/content/renderer/webgraphicscontext3d_provider_impl.cc)).
  - Android WebView has no site isolation, so the app and every game iframe share those 8.
  - WebKit allows 16 per process.
  - WKWebView kills the web content process when memory runs out, and Apple publishes no figure for when that happens.

  Three live frames is the ceiling, and the host must handle a lost context by reloading the frame **[device test]**.
- **Engine caching.** Chrome keys its HTTP cache on (top-level site, frame site, URL). With the app at `app.<domain>` and games at `g1.<games-domain>` and `g2.<games-domain>`, every game has the same key, so the engine downloads once and is shared ([Chrome blog](https://developer.chrome.com/blog/http-cache-partitioning)). Android WebView doesn't partition the cache at all. Safari partitions by top-level site and Firefox by top-level site, so both share it too.
- **Public Suffix List: decided against for now.** Listing `<games-domain>` would make every game its own site, giving separate cookie jars and possibly separate processes. It would also stop Chrome sharing the engine. The edge worker ignores cookies on the games domain, so cross-game cookie tricks gain nothing. If we ever need to list it, the host can fetch the engine once and pass it to each frame by postMessage.
- **Browser storage is not reliable** in game frames. Cross-site iframe storage is partitioned in Chrome and Firefox, and Safari may keep it in memory only. Saves therefore always go through the host to the server (`04-platform-services.md`).

### The gesture conflict

Swiping up to the next game clashes with any game that uses vertical swipes or drags. Options:

| Option | How it works | Cost |
|---|---|---|
| A. Feed owns vertical swipes | Games may only use taps, horizontal swipes and drags inside a bounded area | Rules out some genres; easy to enforce through `input` in the manifest |
| B. Two modes | In the feed, the game runs in attract mode and swipes scroll. A first tap enters focus mode, where the game gets all input and a small "next" control appears. After `end()`, swipe works again | One extra tap; clean rules; the most flexible |
| C. Edge rail | Swipe only from a strip at the screen edge | Easy to miss, and clashes with OS gestures on iOS |

Proposal: **B as the default, relaxed to A for games whose manifest declares no vertical gestures** (those can be swiped past even mid-game). Prototype A and B in the runtime spike and measure accidental swipes and time to first input.

### Audio

Browsers block autoplay with sound until the user interacts, and the activation has to be delegated to cross-origin frames (`allow="autoplay"`). Games start muted in the feed. The first tap, which also enters focus mode, unlocks audio. The host owns a global mute toggle and tells games through `onAudio`. Behaviour inside WKWebView and Android WebView needs testing on devices **[device test]**.

## 6. Native shell (Phase 2)

The first native app is a thin shell (Expo) whose WebView loads the web app. Games remain iframes inside it, so the protocol does not change. The shell adds push notifications, the native share sheet and app store presence. Those are used by the host, and never exposed to games (Apple 4.7.2). One WebView per game, for stronger process isolation, is a later option that the same protocol supports: the SDK would talk to a native bridge instead of `window.parent`.

App store conditions that shape the shell (details in `03-checks-and-safety.md` §6):

- **4.7.4: every game needs a stable universal link and metadata in an index.** Our per-game pages already provide this.
- **4.7.5: games rated above the app's age rating must be flagged and restricted** by verified or declared age.
- **Apple's Mini Apps Partner Program** (announced 13 November 2025) pays creators 85% of qualifying in-app purchases. It requires the Advanced Commerce API, the Declared Age Range API and Apple in-app purchase, and the mini apps must come from parties we don't control ([Apple](https://developer.apple.com/programs/mini-apps-partner/)). That is relevant once creators can sell anything.
