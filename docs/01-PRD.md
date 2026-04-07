# Vibe — Product Requirements Document (PRD)

**Version:** 3.0 (Build-Ready)
**Last Updated:** 2026-03-28
**Status:** Ready for Engineering

---

## 1. Executive Summary

Vibe is a mobile-only social platform where non-technical users create, share, and play AI-generated interactive apps — games, stories, art tools, utilities — through natural-language conversation with an AI. Every post in the feed is a playable artifact, making each shared app an organic acquisition vehicle.

The platform combines an Instagram-style social layer with a Cursor-style AI generation pipeline, targeting the creative consumer audience (ages 16–35) who want to make things but don't know how to code.

---

## 2. Product Vision

**One-liner:** "Instagram, but every post is a playable app you made by talking to AI."

**Core Insight:** The shareable unit is not a photo or video — it is a finished, playable app artifact. When users share a game or interactive story to the feed, every person who plays it experiences the platform's value proposition firsthand. Each artifact is a self-contained acquisition vehicle.

**Why Mobile-Only:** The target demographic lives on their phones. Mobile-first is not enough — mobile-only ensures every UX decision optimizes for thumb-driven creation and consumption. Desktop is explicitly out of scope for V1.

---

## 3. Target Audience

| Attribute | Detail |
|---|---|
| **Age range** | 16–35 |
| **Technical skill** | Non-technical — zero coding knowledge assumed |
| **Motivation** | Creative expression, social sharing, play |
| **Platforms** | iOS and Android (simultaneous launch) |
| **Comparable behaviors** | Posts on TikTok/Instagram, plays mobile games, uses Canva/CapCut for creative projects |

**Primary Persona — "The Creator":** A 22-year-old who has ideas for games and interactive experiences but no ability to build them. They describe what they want in plain language and share the result with friends.

**Secondary Persona — "The Player":** A 19-year-old who discovers apps through their feed, plays them, and is inspired to remix or create their own.

**Anti-Persona:** Developers seeking a coding tool. This is not a development environment. The AI handles all code generation invisibly.

---

## 4. V1 Feature Priority (Ordered)

The following is the strict priority order established for V1. Features are built and shipped in this sequence:

1. **Social Layer** — Feed, profiles, followers/following, likes, comments, share
2. **Multiplayer-Playable Apps** — Real-time and turn-based multiplayer primitives
3. **Remix / Fork** — One-tap remix with full lineage tracking
4. **Co-Creation** — Collaborative app building (stretch goal for V1)

---

## 5. Core Product Surfaces

### 5.1 The Feed

The primary surface. A vertically-scrolling feed of playable app artifacts, similar to Instagram's main feed.

- Each card shows: app thumbnail/preview, creator avatar + name, title, play count, like count, remix count, save button
- Tapping a card opens the app in a full-screen player (sandboxed WebView)
- Three tabs: **Home** (algorithmic), **Following** (reverse chronological), **Explore** (trending/discovery)
- Home feed blends social graph content, trending apps, and new creator discovery
- Full algorithm specification in `11-Feed-Algorithm.md`

### 5.1.1 App Versioning & Saves

Apps are ephemeral by default — a TikTok-like experience where you play and move on. For apps worth returning to, users can **Save** (bookmark) them.

- **Every edit creates a new version.** Each generation or edit produces an immutable snapshot stored in GCS, keyed by timestamp. No version is ever overwritten or deleted.
- **Head is @latest.** The `apps` table has a `current_version_id` pointer. Players, feed, and saves all resolve through this pointer and always see the latest version.
- **Revert is instant.** Creators can revert to any previous version — it just moves the pointer. The old version still exists in storage.
- **Saves always load the latest version.** A saved app shows whatever the creator's current head is — not a frozen snapshot.
- **Active multiplayer sessions are pinned.** If players are mid-game when the creator publishes an edit, the in-progress session continues on the cached bundle. New sessions load the new version.
- **Saved apps** appear in a dedicated section on the user's profile.
- **Version history** is visible to the creator (not public in V1). Enables future features like per-version analytics and A/B testing.

### 5.2 The Creation Studio

The AI-powered app creation experience. Entirely conversational.

- Full-screen chat interface (similar to ChatGPT mobile UX)
- User describes what they want to build in plain language
- AI silently enhances the prompt, then presents a structured plan with quick-reply buttons
- User approves or modifies the plan
- AI generates the app (45–120 second generation time is acceptable)
- Progress indicator during generation (not a spinner — show meaningful stages)
- Generated app appears inline in the chat for immediate testing
- User can iterate via follow-up messages ("make the enemies faster", "change the color to blue")
- "Post to Feed" button when satisfied

### 5.3 The Player

Full-screen sandboxed execution environment for playing apps.

- Apps run in a JavaScript sandbox via WebView
- Each app is self-contained HTML/CSS/JS
- Multiplayer apps connect via the Vibe SDK (`window.vibe`)
- Player controls: exit, like, remix, share, report
- App metadata visible: creator, description, remix lineage

### 5.4 Profiles

Standard social profile page.

- Avatar, display name, bio
- Created apps grid
- Remixed apps grid
- Follower / following counts
- Follow / unfollow button

### 5.5 Notifications

Standard notification center.

- New followers
- Likes on your apps
- Comments on your apps
- Remixes of your apps (with lineage link)
- Multiplayer invites

---

## 6. Social Layer Specification

### 6.1 Social Graph

- **Model:** Followers / Following (asymmetric, like Instagram/Twitter)
- **Not** mutual friends (symmetric) — asymmetric graphs scale better for creator platforms
- Follow is instant (no approval flow in V1)

### 6.2 Interactions

| Interaction | Scope | Notes |
|---|---|---|
| Like | Per-app | Simple like, no reactions in V1 |
| Comment | Per-app | Text-only in V1, threaded replies |
| Share | Per-app | Deep link to app, shareable outside platform |
| Remix | Per-app | One-tap fork with full lineage tracking |
| Save | Per-app | Bookmark to play again later; always loads latest version |
| Play | Per-app | Duration tracked for feed ranking signals |

### 6.3 Content Moderation

Moderation is layered across the AI pipeline rather than handled by a separate system. Each existing pipeline layer carries a moderation responsibility at zero additional cost, plus one lightweight post-render scan.

**Layer 1 — Prompt Enhancer (intent screening).** Rejects prompts that describe content targeting real groups, self-harm instructions, CSAM, or phishing tools. This is the cheapest and earliest rejection point. Cartoon/fantasy violence is explicitly allowed.

**Layer 2 — Planner (borderline deflection).** If the enhanced spec describes borderline content, the Planner cheerfully redirects the user to a different idea instead of presenting a plan. Non-judgmental tone — no policy lectures.

**Layer 3 — Generator (built-in model safety).** Frontier models (Claude, GPT-4o) have built-in refusals for harmful content. The Generator's system prompt reinforces this. No additional cost.

**Layer 4 — Post-render content scan (new, ~$0.003/generation).** After the Validator passes the app in Playwright, two parallel checks run on the rendered output: (a) text extraction + fast LLM classification for hate speech, explicit content, PII, and phishing language; (b) screenshot safety classification via AWS Rekognition or equivalent. Apps that fail either check are set to `under_review` status instead of `published`.

**Layer 5 — User reports (reactive).** Standard report flow for anything that slips through automated layers. Reports land in an admin dashboard with app preview, flag reason, and approve/remove actions.

**Edit pipeline coverage.** The post-render content scan re-runs after every edit, not just full generations, to prevent incremental steering toward harmful content.

**Design principle:** When in doubt, allow it. False positives (blocking benign apps) damage the creation experience more than edge cases damage the platform, especially at V1 scale. The sandbox already prevents apps from doing anything technically dangerous — the moderation concern is purely about offensive content in the rendered output.

---

## 7. App Generation Specification

### 7.1 What Gets Generated

The AI generates app artifacts consisting of a single HTML file that loads:

- **Phaser 3** — 2D game engine (for games; optional for non-game apps)
- **Tone.js** — Audio synthesis (sound effects and music, no audio files)
- **HTML/CSS** — Structure and styling
- **JavaScript** — Logic and interactivity
- **Inline assets** — SVG art, emoji sprites, base64 pixel art, procedural graphics (all generated by the AI, embedded in the HTML)

Bundled into a single deployable HTML file. The only external loads are Phaser and Tone.js from a whitelisted CDN (`cdn.jsdelivr.net`), plus the Vibe SDK (injected by the platform at runtime).

### 7.2 Asset Generation (No Pre-Made Assets)

Apps contain zero pre-made sprites, images, or audio files. All assets are generated by the AI as part of the code:

| Technique | Best For | How It Works |
|---|---|---|
| **Inline SVG** | Characters, objects, environments, UI | LLM generates SVG markup, converted to Phaser textures via data URIs |
| **Emoji sprites** | Casual games, quick prototypes | Emoji rendered to canvas, used as Phaser textures (🚀 👾 🍎 ⚔️) |
| **Base64 pixel art** | Retro-themed games | Small 16×16 or 32×32 sprites encoded as data URIs |
| **Procedural graphics** | Geometric games, backgrounds, particles | Phaser Graphics API draws shapes, generates textures at runtime |
| **Synthesized audio** | Sound effects, background music | Tone.js creates sounds programmatically (bleeps, explosions, melodies) |

The Prompt Enhancer selects an `ASSET_STRATEGY` based on the user's description and visual theme. This determines which combination of techniques the Generator uses.

### 7.3 App Categories

| Category | Examples |
|---|---|
| Games | Platformers, puzzle games, card games, trivia, idle clickers, battle games |
| Interactive Stories | Choose-your-own-adventure, visual novels, interactive fiction |
| Art Tools | Drawing apps, pixel art editors, generative art, music makers |
| Utilities | Timers, calculators, trackers, quizzes, polls |
| Social/Multiplayer | Party games, collaborative drawing, competitive leaderboard games |

### 7.4 Generation Time Budget

- **Acceptable range:** 45–120 seconds
- **Rationale:** Complex, engaging, high-quality apps justify the wait. Users are requesting something meaningful, not a quick text response. The analogy is rendering a video, not sending a message.
- **UX during generation:** Multi-stage progress indicator showing meaningful steps (e.g., "Designing your game…", "Building the levels…", "Adding the finishing touches…")

### 7.5 Edit Pipeline

Small tweaks and iterations bypass the full generation pipeline:

- Trigger: Follow-up messages after initial generation ("make the enemies faster", "change the background to dark mode")
- Handled by a fast model (not the full frontier Generator)
- Response time target: 5–15 seconds
- Scope: CSS changes, parameter tweaks, text changes, simple logic modifications
- Falls back to full pipeline if the edit is too complex (e.g., "add a multiplayer mode")

---

## 8. Multiplayer Specification

### 8.1 Multiplayer Primitives

The platform provides multiplayer infrastructure as a JavaScript SDK (`window.vibe`) that AI-generated apps can use. The AI is trained to generate apps that leverage these primitives.

| Primitive | Description |
|---|---|
| **Lobby** | Create/join game sessions, invite friends, matchmaking |
| **Turn System** | Turn-based game support, turn order, turn timers |
| **Real-Time Sync** | Low-latency state synchronization for action games |
| **Scoreboard** | Per-app leaderboards, high scores, rankings |
| **Shared State** | Key-value store synchronized across all players in a session |

### 8.2 Multiplayer UX Flow

1. Creator builds a multiplayer app via AI conversation
2. App is posted to feed
3. Player opens app → sees "Play Solo" or "Play with Friends"
4. "Play with Friends" → creates a lobby → generates a share link / sends notification to followers
5. Friends join lobby → game starts when host confirms
6. During play, all state syncs via `window.vibe` SDK
7. Post-game: scores recorded to leaderboard

### 8.3 Technical Constraints

- Maximum players per session: 8 (V1)
- Real-time sync target latency: <100ms
- Session timeout: 30 minutes of inactivity
- State payload limit: 64KB per sync message

---

## 9. Remix / Fork Specification

### 9.1 Core Mechanic

Remix is a first-class growth mechanic, not a secondary feature.

- One-tap "Remix" button on any app
- Opens the Creation Studio with the original app's source loaded
- User can modify via conversation ("make it space-themed instead of underwater")
- Full AI pipeline available for modifications

### 9.2 Lineage Tracking

- Every remixed app maintains a link to its parent
- Full ancestry chain is visible (App C → remixed from B → remixed from A)
- Original creator gets notification when their app is remixed
- Remix count displayed on the original app's card
- "Remix tree" visualization available on any app's detail page

### 9.3 Attribution

- Remixed apps display "Remixed from [Original Creator]" prominently
- Original creator's profile linked from the remix
- No opt-out of remixing in V1 (all published apps are remixable)

---

## 10. Monetization

- **V1:** Free. No monetization at launch.
- **Future considerations (post-V1):**
  - Creator tipping
  - Premium app features (e.g., more complex generations, higher multiplayer limits)
  - Featured placement in explore tab
  - Subscription tier for power creators

---

## 11. Platform & Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Client framework** | React Native | Simultaneous iOS + Android from single codebase |
| **App runtime** | WebView (JavaScript sandbox) | Self-contained HTML apps, safe sandboxing |
| **Game engine** | Phaser 3 (pre-loaded into WebView) | Physics, particles, sprites, animation — LLMs generate good Phaser code |
| **Audio** | Tone.js (pre-loaded into WebView) | Synthesized sound effects and music, no audio files needed |
| **Asset strategy** | AI-generated (SVG, emoji, procedural, pixel art) | No pre-made sprite library; every game has unique visuals |
| **AI generation output** | Single HTML file (Phaser/Tone.js injected at runtime) | Simple deployment, no build step, rich game capability |
| **Multiplayer SDK** | `window.vibe` JS API | Injected into WebView at runtime, available to all apps |
| **Social graph** | Followers/following (asymmetric) | Better for creator platforms, proven at scale |
| **Launch platforms** | iOS + Android simultaneously | React Native enables this without separate teams |

---

## 12. Success Metrics (V1)

| Metric | Target | Rationale |
|---|---|---|
| **Apps created per creator per week** | ≥3 | Indicates creation is easy and engaging |
| **App completion rate** | ≥70% | Users who start creating finish and publish |
| **Feed engagement (plays per DAU)** | ≥5 | Feed is compelling enough to drive repeat plays |
| **Remix rate** | ≥15% of plays | Remix loop is driving creation |
| **D7 retention** | ≥40% | Platform is sticky |
| **Multiplayer session creation rate** | ≥20% of multiplayer-capable apps | Multiplayer primitives are discoverable and usable |

---

## 13. Out of Scope (V1)

- Desktop/web client
- Monetization and payments
- Direct messaging between users
- App store / categorized browsing (beyond basic explore)
- User-uploaded assets (images, audio) in apps
- Offline app support
- API access for third-party developers
- Localization (English only at launch)

---

## 14. Resolved Engineering Questions

All open questions from the planning phase have been resolved and documented:

| # | Question | Resolution | Document |
|---|---|---|---|
| 1 | CDN strategy for app artifacts | GCS with Cloud CDN. Immutable bundles keyed `{app_id}/{version}.html`, aggressive caching (`max-age=31536000, immutable`). No invalidation needed — edits create new versions. | `09-Infrastructure-Deployment.md` §5 |
| 2 | WebView security hardening | Full CSP policy specified. WebView config with all security flags. Phaser/Tone.js pre-loaded into WebView from app binary — no external CDN in client CSP. | `02-Technical-Architecture.md` §2.3 |
| 3 | Real-time infrastructure | Firebase Realtime Database for both generation streaming and multiplayer state sync. Lower latency than Firestore, no custom WebSocket infra to maintain. Security rules specified. | `09-Infrastructure-Deployment.md` §4 |
| 4 | Content moderation pipeline | Five-layer AI-integrated moderation: Prompt Enhancer (intent screening) → Planner (borderline deflection) → Generator (built-in model safety) → post-render content scan (text classification + screenshot safety, ~$0.003) → user reports (reactive). No separate moderation service. Edit pipeline outputs re-scanned. | `03-AI-Pipeline-Specification.md` §6, `01-PRD.md` §6.3 |
| 5 | Push notification infrastructure | Expo Notifications wrapping FCM + APNs. Cross-platform from single API. Notification grouping and quiet hours deferred to post-V1 (UX polish, no architectural impact). | `09-Infrastructure-Deployment.md` §1 |
