# Vibe — Seed Content & Launch Strategy

**Version:** 3.0 (Build-Ready)
**Last Updated:** 2026-03-28
**Status:** Ready for Engineering

---

## 1. The Cold Start Problem

A social platform with an empty feed is dead on arrival. Users who open Vibe for the first time must immediately see compelling, playable apps that demonstrate the platform's value proposition. Seed content solves this.

---

## 2. Seed Content Plan

### 2.1 Target Numbers

| Metric | Target |
|---|---|
| Seed apps at launch | 20–30 |
| Categories covered | ~5 (Games, Stories, Art Tools, Utilities, Multiplayer) |
| "Creator" accounts | 8–10 minimal profiles ("Vibe Originals") |
| Apps per category | 4–6 |

### 2.2 Vibe Originals Accounts

Seed apps are published under ~8–10 fake creator accounts styled as platform-native power users. These are not disclosed as official — they appear as organic early creators.

| Account | Style | Focus |
|---|---|---|
| @pixelwitch | Retro/pixel art aesthetic | Pixel art games, retro arcade |
| @neonlabs | Neon/cyberpunk | Action games, neon art tools |
| @storyweaver | Illustrated/warm | Interactive stories, visual novels |
| @minimalcraft | Clean/minimal | Utilities, productivity tools |
| @kawaiiworld | Cute/pastel | Casual games, kawaii art |
| @wildcard | Eclectic/random | Surprise mix — demonstrates variety |
| @partymode | Bright/social | Multiplayer party games |
| @quizmaster | Bold/typography | Trivia, quizzes, learning tools |

Each account has:
- Avatar (generated or stock)
- Display name and bio
- 2–4 published apps
- Follows a few other Vibe Originals accounts (creates a sparse social graph)

### 2.3 Seed App Categories

**Games (8–10 apps):**
- Classic arcade (snake, breakout, asteroids, etc.)
- Puzzle games (2048, sudoku, word search)
- Idle/clicker game
- Platformer
- 2-player competitive game (multiplayer)

**Interactive Stories (4–5 apps):**
- Choose-your-own-adventure (fantasy setting)
- Mystery/detective story
- Sci-fi branching narrative
- Horror short story

**Art Tools (3–4 apps):**
- Pixel art editor
- Drawing canvas with brushes
- Generative art toy (tap to create patterns)
- Music maker / drum machine

**Utilities (3–4 apps):**
- Pomodoro timer
- Trivia quiz
- Habit tracker
- Would You Rather game

**Multiplayer (2–3 apps):**
- Tic-tac-toe
- Drawing guessing game (like Pictionary)
- Trivia battle

### 2.4 Quality Bar

Seed apps must be indistinguishable from the best apps a real user would create. They serve as the quality benchmark. Each seed app must:

- Pass all Validator tests
- Be genuinely fun / useful / engaging (subjective, reviewed by team)
- Look polished (not a homework assignment)
- Work flawlessly on iOS and Android
- Have an appropriate title, description, and auto-generated thumbnail
- Represent what the AI can actually produce (no hand-coded ringers)

### 2.5 Generation Process

Seed apps are generated using the production AI pipeline — the same pipeline real users will use. This serves double duty:

1. Produces seed content
2. Stress-tests the AI pipeline before launch

**Process:**
1. Write 30–40 high-quality prompts covering the target categories
2. Run each through the full production pipeline
3. Review outputs, iterate prompts where needed
4. Publish the best 20–30 under Vibe Originals accounts
5. Archive generation logs as training data for future distillation

---

## 3. Pre-Launch Checklist

### 3.1 Platform Readiness

| Item | Owner | Status |
|---|---|---|
| All V1 API endpoints functional | Backend | ☐ |
| Feed rendering with pagination | Client | ☐ |
| Creation Studio end-to-end | Client + AI | ☐ |
| App Player with WebView sandbox | Client | ☐ |
| Multiplayer lobby + real-time sync | Multiplayer | ☐ |
| Push notifications (FCM + APNs) | Backend | ☐ |
| Auth (email + Apple + Google) | Backend | ☐ |
| Remix flow end-to-end | Client + AI | ☐ |
| Analytics events firing correctly | Client + Backend | ☐ |
| Content moderation (report flow) | Backend | ☐ |
| Seed content published (20–30 apps) | AI + QA | ☐ |
| AI pipeline smoke tests green | CI/CD | ☐ |
| App Store / Play Store listings | Marketing | ☐ |
| Deep link / share URLs working | Backend + Client | ☐ |
| Error monitoring live (Sentry or equivalent) | DevOps | ☐ |

### 3.2 Performance Targets (Pre-Launch Validation)

| Metric | Target |
|---|---|
| Feed load time (cold) | < 2 seconds |
| Feed load time (warm) | < 500ms |
| App player load time | < 1 second |
| API P95 latency | < 500ms |
| AI generation success rate | > 80% |
| WebSocket connection time | < 1 second |
| App size (typical bundle) | < 500KB |

---

## 4. Launch Phases

### Phase 0: Internal Testing (2 weeks before launch)
- Team + close friends use the platform daily
- Bug bash, UX feedback
- AI pipeline tuning based on real usage
- Seed content finalized

### Phase 1: Closed Beta (1–2 weeks)
- 100–200 invited users (target demographic: 16–35, non-technical)
- Invite codes distributed via social media, college networks
- Focus metrics: creation completion rate, D1/D7 retention, bug reports
- Daily monitoring of all 7 analytics funnels

### Phase 2: Open Beta
- Remove invite gate
- App Store / Play Store public listing
- Organic growth only (no paid acquisition)
- Monitor infrastructure scaling
- Iterate based on funnel data

### Phase 3: Growth (Post-Beta)
- Social media marketing (TikTok, Instagram)
- Creator spotlight programs
- Challenges / themed creation events
- Web preview for non-installed users (V1.1)

---

## 5. V1.1 Roadmap Items (Post-Launch)

These were explicitly deferred from V1 during planning:

| Feature | Priority | Notes |
|---|---|---|
| **Web preview** (static playable link) | Highest | Non-installed users can play via browser. Firebase Dynamic Links. Critical for viral sharing. |
| **Challenges** | High | Themed creation challenges ("Make a game about space this week"). Community event mechanic. |
| **Search & categorized browsing** | High | Explore tab gets structured categories, tags, search. |
| **User-uploaded assets** | Medium | Allow users to upload images/audio for use in generated apps. |
| **Creator analytics** | Medium | Dashboard showing play counts, likes, remix stats per app. |
| **Direct messaging** | Low | User-to-user messaging. Deferred due to moderation complexity. |
| **Monetization** | Low | Creator tipping, premium features. Requires payment infrastructure. |
