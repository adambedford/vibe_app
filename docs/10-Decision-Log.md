# Vibe — Decision Log

**Version:** 3.0
**Last Updated:** 2026-03-28
**Purpose:** Single-source record of every significant product, technical, and strategic decision made during planning. Organized by domain.

---

## Product Decisions

| # | Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|---|
| P1 | Core concept | Instagram where every post is a playable app | Coding tool, game marketplace, prompt library | The shareable unit being a playable artifact makes every share an acquisition event |
| P2 | Target audience | Non-technical creators, ages 16–35 | Developers, power users, children | Non-technical users are the larger market; developer tools already exist |
| P3 | Platform | Mobile-only (iOS + Android) | Web-first, mobile + web | Target audience lives on mobile; mobile-only forces all UX to be thumb-optimized |
| P4 | V1 feature priority order | Social → Multiplayer → Remix → Co-creation | Various orderings | Social layer is table stakes; multiplayer creates stickiness; remix drives creation flywheel |
| P5 | Social graph model | Followers/following (asymmetric) | Mutual friends (symmetric) | Asymmetric graphs scale better for creator platforms (Instagram, TikTok model) |
| P6 | Generation time budget | 45–120 seconds acceptable | Sub-10s fast generation | Quality of output matters more than speed; complex/engaging apps justify the wait |
| P7 | Monetization at launch | Free, no monetization | Freemium, ads, premium | Maximize adoption first; monetization deferred to post-V1 |
| P8 | Remix opt-out | No opt-out in V1 (all published apps are remixable) | Per-app remix toggle | Remix is a core growth mechanic, not an optional feature |
| P9 | Content moderation (V1) | Report-based only, no hard quality gate | Pre-publish AI review, human review queue | Report-based is simplest to implement; can add proactive scanning post-launch |
| P10 | Onboarding strategy | Feed-first, sign-up wall after 2–3 plays | Sign-up first, immediate creation | Users need to experience value before being asked to commit |
| P11 | First creation UX | 4-step guided walkthrough (category → visual → content → free text) | Blank text input, template gallery | Non-technical users don't know what to type; walkthrough funnels them |
| P12 | App shareable outside platform | Yes, deep links to playable apps | Platform-only, screenshot sharing | Every share is user acquisition; web preview is V1.1 |
| P13 | Maximum multiplayer players | 8 per session | 2, 4, 16 | 8 covers most party game formats; higher adds infrastructure complexity |
| P14 | Seed content strategy | 20–30 AI-generated apps under ~8–10 "Vibe Originals" accounts | Hand-coded showcase apps, empty launch | Must use same AI pipeline (proves it works); fake-organic accounts avoid "corporate" feel |
| P15 | Web preview (non-installed users) | Deferred to V1.1 (highest priority) | V1 scope | Requires Firebase Dynamic Links setup; too much scope for V1 but critical for viral growth |
| P16 | Challenges feature | Deferred to V1.1 | V1 scope | Good engagement mechanic but not needed for core loop validation |
| P17 | Feed algorithm | Weighted scoring (quality × freshness × social) with diversity rules | ML ranking model, pure chronological, simple trending | Hand-tuned weights are debuggable for a small team; ML ranking premature without data; captures right signals from day one |
| P18 | App versioning | Timestamp-keyed immutable versions with `current_version_id` pointer (head = @latest) | Git, sequential version numbers, in-place replacement (no history) | Timestamps are naturally unique (no counter coordination), sort correctly, and self-document; immutable snapshots enable instant revert; git is overkill (no branching, merging, or multi-editor collaboration needed) |
| P19 | Save / bookmark mechanic | Users can save apps to play again later; always loads latest version | No save feature, save freezes a version, save with version picker | Saves are bookmarks, not snapshots; keeping it simple aligns with ephemeral-first philosophy |
| P20 | Feed quality signal weighting | Play duration (0.35), like ratio (0.25), remix rate (0.20), replay (0.10), share (0.10) | Equal weights, likes-only, play-count-only | Play duration is the purest engagement signal; remix rate is unique to Vibe and drives the flywheel; weights are tunable post-launch |
| P21 | Cold start for new apps | 2× freshness boost for first 6 hours or 10 plays, with early bounce penalty | No boost (rely on social graph), creator-pays-for-promotion, always boost | Every creator deserves initial exposure; bounce penalty prevents gaming; 10-play threshold is enough for real signals |

---

## Technical Decisions

| # | Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|---|
| T1 | Client framework | React Native (Expo) | Flutter, native iOS/Android, PWA | Simultaneous iOS/Android from single codebase; Expo speeds iteration |
| T2 | State management | Zustand | Redux, MobX, Context API | Lightweight, minimal boilerplate, TypeScript-native |
| T3 | Data fetching | TanStack Query | SWR, Apollo, custom | Best-in-class caching, optimistic updates, pagination support |
| T4 | App runtime | WebView (react-native-webview) | Custom renderer, iframe, React Native dynamic components | WebView runs standard HTML/CSS/JS; safe sandbox; simplest for AI to generate |
| T5 | Generated app format | Single self-contained HTML file (inline CSS + JS) | Multi-file bundles, React components, JSON config | Simplest deployment; no build step; AI generates one artifact |
| T6 | Backend framework | Ruby on Rails | Node.js/Express, Django, Go, Elixir | Fastest development velocity for 2–3 person team; convention-over-config |
| T7 | Backend hosting | Railway | AWS ECS, Fly.io, Render, Heroku | Zero DevOps overhead; git-push deploys; managed Postgres; scales enough for V1 |
| T8 | Database | PostgreSQL (Railway managed) | MySQL, MongoDB, Supabase | Relational model fits social graph + app metadata; JSONB for flexible fields |
| T9 | Background jobs | SolidQueue | Sidekiq, Resque, GoodJob | Rails-native; no Redis dependency for basic queuing; simpler infrastructure |
| T10 | Real-time infrastructure | Firebase (Realtime Database) | WebSocket server (ws/Socket.io), Pusher, Ably, Supabase Realtime | Firebase handles scaling, reconnection, offline sync; no custom WebSocket infra to maintain |
| T11 | AI generation streaming | Firebase Realtime Database | Server-Sent Events, WebSocket, polling | Client already connected to Firebase; natural fit for progress updates |
| T12 | Asset storage | Google Cloud Storage | AWS S3, Cloudflare R2 | Same Google ecosystem as Firebase; simple signed URLs; CDN built in |
| T13 | App validation | Playwright (sidecar service on Railway) | Puppeteer, Selenium, jsdom | Playwright is faster, more reliable, better API than Puppeteer; cross-browser support |
| T14 | Analytics | Amplitude | Mixpanel, PostHog, custom | Best funnel analysis; native RN SDK; free tier sufficient for launch |
| T15 | CI/CD | GitHub Actions | CircleCI, Railway auto-deploy only | GitHub-native; free for public repos; marketplace actions for RN/Expo |
| T16 | Push notifications | Expo Notifications | Firebase Cloud Messaging direct, OneSignal | Expo wraps FCM+APNs cleanly; one API for both platforms |
| T17 | Game engine | Phaser 3 (CDN-loaded) | Raw canvas, PixiJS, Kaboom.js, no engine | Phaser has physics, particles, sprites, tweens, input handling; LLMs produce good Phaser code due to training data volume; single biggest quality-ceiling lift |
| T18 | Audio synthesis | Tone.js (CDN-loaded) | Web Audio API raw, Howler.js, platform-only sound effects | Tone.js abstracts Web Audio complexity; enables synthesized SFX and music; no audio files needed |
| T19 | Asset strategy | AI-generated (inline SVG, emoji, base64 pixel art, procedural) | Pre-made sprite library, user-uploaded assets, no assets | Every game gets unique visuals as part of generation; no library to maintain; SVG quality is surprisingly high from LLMs |
| T20 | CDN whitelist | cdn.jsdelivr.net in Validator only; client pre-loads libraries | CDN in client CSP, multiple CDNs, no CDN | Pre-loading into WebView eliminates CDN dependency at runtime; Validator still uses CDN to test the HTML as-generated; tighter CSP with zero external script-src |
| T21 | Library pre-loading | Phaser + Tone.js + Vibe SDK bundled with RN binary, injected via `injectedJavaScriptBeforeContentLoaded` | CDN loading at runtime, service worker caching, embed in HTML bundle | Instant game load (no 1MB Phaser fetch), offline-resilient, version-locked to app binary, tighter CSP; ~1.2MB added to binary is negligible |
| T22 | API response pattern | Presenter pattern (ApplicationPresenter → resource presenters) | Serializer gem (blueprinter/alba), jbuilder views, as_json on models | Presenters are plain Ruby, testable, no gem dependency; compact vs. full representations per resource; consistent `{ data }` / `{ data, pagination }` envelope |
| T23 | API controller pattern | ApiController base with concerns (Authentication, ErrorHandling, Pagination, Filtering) | ApplicationController with before_actions, separate middleware, grape API | Concerns are composable and testable; single base class keeps all controllers consistent; render_resource/render_collection helpers eliminate boilerplate |
| T24 | Pagination | Cursor-based via Kaminari + custom concern (cursor = created_at timestamp) | Offset pagination, page-number pagination, keyset without gem | Cursor is stable under inserts (offset pagination breaks when new items are added); timestamps are natural cursors; Kaminari handles the collection setup |
| T25 | App record lifecycle | Auto-create draft App when creation session starts; explicit publish action | Create App on publish only, create on plan approval | Draft-first means the App record exists throughout the pipeline; generation flow can reference `session.app` without lifecycle ambiguity; 30-day cleanup for abandoned drafts |
| T26 | Error response format | Consistent `{ error: { code, message, details? } }` envelope via ErrorHandling concern | Rails default errors, problem+json RFC 7807, custom per-endpoint | Single format across all error types; `details` array for validation errors with per-field messages; rescue_from handlers catch common cases automatically |
| T27 | Avatar upload | Active Storage with GCS backend, multipart via `PATCH /users/me` | Direct GCS signed URL upload, separate upload endpoint, Cloudinary | Active Storage is Rails-native, handles attachment lifecycle; single endpoint for profile updates (text + avatar); V1.1 adds server-side resizing via image_processing gem |
| T28 | Account deletion | Async via AccountDeletionJob: delete content, anonymize profile, soft-delete record | Hard delete everything, synchronous deletion, no deletion | Required for App Store / Play Store approval; async because GCS cleanup is slow; anonymize rather than hard-delete user record for audit trail; comments show [deleted] |

---

## AI Pipeline Decisions

| # | Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|---|
| A1 | Pipeline architecture | 5-layer: Router → Enhancer → Planner → Generator → Validator | Single model, 2-model (plan + generate), agent loop | Each layer has distinct latency/cost profile; mirrors Cursor's proven architecture |
| A2 | Router implementation | Rule-based (no LLM) | Small LLM classifier | Classification is simple enough for heuristics; saves model call and latency |
| A3 | Prompt Enhancer visibility | Silent (user never sees output) | Show enhanced prompt to user | Showing the enhanced prompt would confuse non-technical users; it's internal plumbing |
| A4 | Planner user interaction | User-facing plan with quick-reply buttons + optional clarifying Qs | Always ask questions, never ask questions | Plan mode builds trust and reduces wasted generation; quick-replies keep it low-friction |
| A5 | Planner question threshold | Max 2 questions, only if ambiguity leads to fundamentally different apps | Always ask, never ask, 3+ questions | Non-technical users get frustrated by too many questions; 2 is the sweet spot |
| A6 | Generator model class | Frontier/Codex-class (Sonnet, GPT-4o, or equivalent) | Small/fast model, medium model | Output quality is the product; this is the one layer where cost is justified |
| A7 | Generator time budget | 45–120 seconds | Sub-30s, unlimited | Explicitly decided that quality > speed; reopened door to Codex-class models |
| A8 | Validator implementation | Headless browser (Playwright) + Error Interpreter LLM | LLM-only review, no validation, manual QA | Automated testing catches real runtime errors; LLM interpreter makes fixes targeted |
| A9 | Maximum fix passes | 3 retries | 1, 2, 5, unlimited | Diminishing returns after 3; cost increases linearly; 3 catches most fixable issues |
| A10 | Edit pipeline | Separate fast model, bypasses full pipeline | Same pipeline for all changes, no edit support | Small tweaks don't need the full pipeline; 5–15s turnaround keeps iteration tight |
| A11 | Edit escalation | Router detects complex edits and escalates to full pipeline | All edits go through fast path, manual user choice | Transparent to user; Router handles the complexity threshold |
| A12 | AI vendor | AWS Bedrock (primary) | OpenAI API direct, Azure OpenAI, Google Vertex AI | Single vendor for inference + distillation + reinforcement fine-tuning; avoids managing infra |
| A13 | Model abstraction | ModelProvider interface per layer | Hardcoded model calls, single global model | Enables per-layer model swapping without pipeline rewrites; critical for post-launch optimization |
| A14 | Post-launch optimization | Distillation → Reinforcement fine-tuning → Specialization roadmap | No fine-tuning, immediate fine-tuning, third-party fine-tuning | Data collection first (months 1–3); distillation needs real production data |
| A15 | Distillation strategy | Teacher (Sonnet) → Student (Haiku custom) via Bedrock | OpenAI fine-tuning, self-hosted training | Bedrock's distillation workflow is purpose-built; keeps everything in one vendor |
| A16 | Reinforcement reward signal | Composite: publish_rate × 0.3 + play_count × 0.3 + remix_rate × 0.2 + session_time × 0.2 | Single metric (e.g., just publish rate), human ratings | Composite captures engagement quality, not just completion; automated, no human labeling needed |
| A17 | Specialization timeline | Months 9–12: category-specific Generator models (game, story, utility) | Single model forever, immediate specialization | Need sufficient per-category data; too early to specialize at launch |
| A18 | Generator game output | Phaser 3 code (not raw canvas) | Raw canvas/DOM, framework-agnostic | Phaser provides physics, particles, tweens, sprites, input — Generator produces higher quality games with less token budget |
| A19 | Asset generation approach | AI generates all assets inline (SVG, emoji, procedural, pixel art) | Pre-made sprite library, user uploads, no visuals | Unique art per game; no asset management; SVG/emoji cover wide aesthetic range; token cost is manageable |
| A20 | Asset strategy selection | Prompt Enhancer chooses ASSET_STRATEGY per app | Generator decides, user chooses, fixed strategy | Enhancer has context to pick best approach; keeps Generator prompt focused on execution |
| A21 | Audio approach | Tone.js synthesis (no audio files) | Platform sound effects only, pre-made audio library, silence | Synthesized audio adds game feel without file management; retro bleeps fit casual aesthetic |
| A22 | Content moderation architecture | Layered across existing pipeline (no separate moderation service) | Separate moderation model, human-review-before-publish, third-party moderation API | Each pipeline layer already reads the content — adding moderation clauses costs zero additional latency or model calls for 4 of 5 layers |
| A23 | Prompt-level moderation | Prompt Enhancer rejects harmful intent (rule 7 in system prompt) | Separate classifier, keyword blocklist, no prompt screening | Enhancer already runs on every prompt; adding a rejection clause is free; catches most bad intent at cheapest layer |
| A24 | Post-render content scan | Text classification (Haiku) + screenshot safety (Rekognition), ~$0.003/generation | LLM reviews full source code, no post-render check, human review all apps | Rendered output is what users see — scanning source code misses runtime-generated content; vision check catches visual issues text analysis can't |
| A25 | Edit pipeline moderation | Content scan re-runs after every edit output | Only scan full generations, trust edit pipeline | Users could incrementally steer content toward harmful territory through small edits; re-scanning is cheap enough to always run |
| A26 | Moderation false-positive philosophy | When in doubt, allow it | When in doubt, block it | False positives (blocking benign apps) damage creation experience more than edge cases at V1 scale; sandbox prevents technical harm regardless |

---

## Strategic Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| S1 | Team size | 2–3 engineers, full scope, AI-assisted development | Rather than rescoping, keep full ambition and rely on AI-assisted velocity (Cursor, Claude Code) |
| S2 | Scope strategy | Full ambition, not reduced scope | AI-assisted development makes ambitious scope feasible for small team |
| S3 | Development approach | Documentation-driven | Decisions captured in numbered spec files before implementation begins |
| S4 | Name | Working titles: "Ludo" and "Vibe" | Final name TBD |
| S5 | Remix positioning | Infrastructure, not a feature | Lineage tracking and fork mechanics are architectural decisions baked into the data model |
| S6 | Generation quality philosophy | Quality over speed | 45–120s is acceptable; a broken app in 10s is worse than a working app in 60s |
| S7 | Bedrock vendor lock-in accepted | Yes, for strategic reasons | Distillation + reinforcement fine-tuning workflow justifies single-vendor commitment |
| S8 | CI strategy | Live pipeline tests on every deploy | Fixed prompt set catches model regressions, system prompt issues, and Validator bugs |

---

## Document Index

| # | Document | Scope |
|---|---|---|
| 01 | `01-PRD.md` | Product vision, features, success metrics |
| 02 | `02-Technical-Architecture.md` | Client architecture, API design, data model |
| 03 | `03-AI-Pipeline-Specification.md` | 5-layer pipeline, system prompts, cost model, fine-tuning roadmap |
| 04 | `04-Vibe-SDK-Specification.md` | `window.vibe` multiplayer SDK API reference |
| 05 | `05-Onboarding-UX-Flows.md` | Onboarding, creation studio UX, player UX, remix flow |
| 06 | `06-Analytics-Instrumentation.md` | Event taxonomy, 7 funnels, dashboards |
| 07 | `07-CICD-Testing-Strategy.md` | Pipelines, testing pyramid, AI pipeline smoke tests |
| 08 | `08-Seed-Content-Launch-Strategy.md` | Seed content, launch phases, V1.1 roadmap |
| 09 | `09-Infrastructure-Deployment.md` | Railway, Firebase, GCS, Bedrock deployment (canonical stack) |
| 10 | `10-Decision-Log.md` | This file — all decisions with rationale |
| 11 | `11-Feed-Algorithm.md` | Feed ranking algorithm, scoring function, caching, database support |
| 12 | `12-API-Reference.md` | Presenter pattern, controller concerns, response shapes, pagination, errors, avatar upload, account deletion |
