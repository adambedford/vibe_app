# Vibe — Onboarding & UX Flows Specification

**Version:** 3.0 (Build-Ready)
**Last Updated:** 2026-03-28
**Status:** Ready for Engineering

---

## 1. First Launch Flow

### 1.1 Design Principle

**Feed-first.** New users land directly in the feed and experience the platform's value (playing apps) before being asked to create an account. The sign-up wall appears after 2–3 plays, when the user has enough context to understand what they're signing up for.

### 1.2 Sequence

```
App Launch
    │
    ▼
┌─────────────────────────┐
│  FEED (anonymous)       │  User can browse and play apps immediately
│  No account required    │  Tab bar shows: Feed, Explore, [Create greyed]
└────────────┬────────────┘
             │
             │  After 2-3 plays
             ▼
┌─────────────────────────┐
│  SIGN-UP WALL           │  "Love what you've played? Create your own."
│  (soft gate)            │  Email/password, Apple Sign-In, Google Sign-In
│                         │  Skip option → can keep browsing but can't create/like/comment
└────────────┬────────────┘
             │
             │  Account created
             ▼
┌─────────────────────────┐
│  PROFILE SETUP          │  Display name, username, avatar (optional)
│  (30 seconds max)       │  "You can always change this later"
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  FIRST CREATION         │  Guided 4-step walkthrough (see Section 2)
│  WALKTHROUGH            │  Leads to their first app creation
└─────────────────────────┘
```

### 1.3 Anonymous Browsing Capabilities

Before sign-up, anonymous users can:
- Browse the feed
- Open and play any app (full functionality including solo play)
- View profiles and app details
- See trending/explore content

Before sign-up, anonymous users **cannot:**
- Create apps
- Like or comment
- Follow creators
- Join multiplayer sessions
- Remix apps
- Receive notifications

### 1.4 Sign-Up Wall Triggers

The sign-up prompt appears when the user attempts any gated action after 2–3 plays:
- Tapping the Create tab
- Tapping Like on an app
- Tapping Follow on a profile
- Tapping Comment
- Tapping Remix
- Attempting to join a multiplayer lobby

**Presentation:** Bottom sheet modal, not a full-screen takeover. User can dismiss and continue browsing.

---

## 2. First Creation Walkthrough

### 2.1 Design Principle

Guided quick-start for non-technical users who may not know what to ask the AI. The walkthrough funnels them into a structured prompt without requiring open-ended text input. Power users can skip directly to free-text.

### 2.2 Four-Step Flow

```
Step 1: Category          Step 2: Visual Theme
┌──────────────────┐      ┌──────────────────┐
│ What do you want │      │ Pick a vibe:     │
│ to make?         │      │                  │
│                  │      │ ○ Neon / Cyber   │
│ ○ Game           │      │ ○ Cute / Kawaii  │
│ ○ Story          │ ───▶ │ ○ Retro / Pixel  │
│ ○ Art Tool       │      │ ○ Clean / Minimal│
│ ○ Utility        │      │ ○ Nature / Earthy│
│ ○ Surprise Me    │      │ ○ Surprise Me    │
└──────────────────┘      └──────────────────┘
                                   │
                                   ▼
Step 3: Content Theme     Step 4: Details (Optional)
┌──────────────────┐      ┌──────────────────┐
│ What's it about? │      │ Anything else?   │
│                  │      │                  │
│ ○ Space          │      │ [Free text input]│
│ ○ Animals        │      │                  │
│ ○ Food           │ ───▶ │ "Add any extra   │
│ ○ Sports         │      │  details, or     │
│ ○ Fantasy        │      │  skip to start   │
│ ○ Mystery        │      │  building!"      │
│ ○ Music          │      │                  │
│ ○ Custom ___     │      │ [Skip] [Build!]  │
└──────────────────┘      └──────────────────┘
```

### 2.3 Step Details

**Step 1 — Category:**
- Single-select from: Game, Story, Art Tool, Utility, Surprise Me
- "Surprise Me" picks a random category + theme combination
- Each option has an emoji icon and short subtitle

**Step 2 — Visual Theme:**
- Single-select from ~6 aesthetic directions
- Each option shows a small color palette swatch or mini-preview
- Options adapt slightly based on Step 1 (e.g., "Game" might show "Arcade" instead of "Clean / Minimal")

**Step 3 — Content Theme:**
- Single-select or type custom
- Options are category-aware:
  - Game: Space, Animals, Food, Sports, Fantasy, Mystery, Custom
  - Story: Romance, Horror, Sci-Fi, Comedy, Adventure, Mystery, Custom
  - Art Tool: Drawing, Music, Patterns, Photography, Custom
  - Utility: Fitness, Productivity, Learning, Social, Custom

**Step 4 — Free Text (Optional):**
- Text input for additional details
- Pre-filled hint: "e.g., 'make the enemies get faster each level' or 'add a plot twist at the end'"
- Skip button prominently displayed — this step is optional
- Character limit: 500 characters

### 2.4 Walkthrough Output

The walkthrough selections are concatenated into a structured prompt that feeds into the AI pipeline:

```
Category: Game
Visual Theme: Neon / Cyber
Content Theme: Space
Additional Details: "make the enemies get faster each level"

→ Concatenated prompt for Prompt Enhancer:
"Create a space-themed game with a neon/cyberpunk visual style.
 The enemies should get faster each level."
```

### 2.5 Skip Walkthrough

A "Just let me type" link is visible throughout the walkthrough for users who know what they want. Tapping it skips directly to the Creation Studio chat interface with an empty text input.

---

## 3. Creation Studio UX Flow

### 3.1 Main Chat Interface

After the walkthrough (or for returning creators), the Creation Studio is a full-screen chat interface:

```
┌──────────────────────────────┐
│  ← Back          New App  ⋮  │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │ 🎮 Here's what I'll   │  │
│  │ build for you:         │  │
│  │                        │  │
│  │ Neon Space Blaster     │  │
│  │ A fast-paced shooter   │  │
│  │ where enemies get      │  │
│  │ faster each level...   │  │
│  │                        │  │
│  │ ✨ Features:           │  │
│  │ • Swipe to move ship   │  │
│  │ • Tap to shoot         │  │
│  │ • 10 levels            │  │
│  │ • Boss battles         │  │
│  │                        │  │
│  │ 🎨 Style: Neon glow   │  │
│  │ on dark space bg       │  │
│  └────────────────────────┘  │
│                              │
│  ┌──────┐ ┌───────────────┐  │
│  │Build!│ │Different style│  │
│  └──────┘ └───────────────┘  │
│  ┌──────────┐ ┌───────────┐  │
│  │Add more  │ │Start over │  │
│  └──────────┘ └───────────┘  │
│                              │
├──────────────────────────────┤
│  Type a message...     Send  │
└──────────────────────────────┘
```

### 3.2 Generation In-Progress State

When the user approves a plan, the generation state replaces the chat:

```
┌──────────────────────────────┐
│  ← Back          New App  ⋮  │
├──────────────────────────────┤
│                              │
│                              │
│         🚀                   │
│                              │
│    Building your app...      │
│                              │
│    ┌──────────────────────┐  │
│    │ ████████░░░░░  58%   │  │
│    └──────────────────────┘  │
│                              │
│    🎨 Adding visual effects  │
│                              │
│    ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│    ✅ Designed game layout    │
│    ✅ Built game mechanics    │
│    🔄 Adding visual effects  │
│    ○ Final polish            │
│    ○ Testing                 │
│                              │
│   You can leave this screen  │
│   — we'll notify you when    │
│   it's ready!                │
│                              │
└──────────────────────────────┘
```

**Stage labels** (shown sequentially, mapped to pipeline stages):
1. "Designing your app…" → Prompt Enhancer running
2. "Planning the build…" → Planner running (but user already saw plan, this is behind-the-scenes re-confirmation)
3. "Building the core…" → Generator running (first half)
4. "Adding visual effects…" → Generator running (second half)
5. "Final polish…" → Generator wrapping up
6. "Testing…" → Validator running
7. "Fixing a small issue…" → Validator retry (only if needed)

**Background generation:** User can leave this screen. A local push notification fires when generation completes: "Your app is ready! 🎮 Tap to play."

### 3.3 Generation Complete

The generated app appears inline in the chat as a playable card:

```
┌──────────────────────────────┐
│                              │
│  ┌────────────────────────┐  │
│  │  ┌──────────────────┐  │  │
│  │  │                  │  │  │
│  │  │   [Live App      │  │  │
│  │  │    Preview]      │  │  │
│  │  │                  │  │  │
│  │  └──────────────────┘  │  │
│  │                        │  │
│  │  ▶ Tap to play         │  │
│  └────────────────────────┘  │
│                              │
│  "Here's your Neon Space     │
│   Blaster! Give it a try."   │
│                              │
│  ┌──────────┐ ┌───────────┐  │
│  │Post to   │ │Keep       │  │
│  │Feed  📤  │ │Editing ✏️ │  │
│  └──────────┘ └───────────┘  │
│                              │
├──────────────────────────────┤
│  "Make enemies faster" Send  │
└──────────────────────────────┘
```

The user can:
- Tap the preview to play in full-screen
- Post directly to the feed
- Continue iterating via chat messages (enters Edit Pipeline)
- Discard and start over

### 3.4 Edit Iteration Loop

After initial generation, follow-up messages enter the Edit Pipeline:

```
User: "make the enemies red instead of green"
    → Edit Pipeline (fast, 5-15s)
    → Updated app appears inline

User: "add a boss battle at level 5"
    → Router detects complex change → Full Generation Pipeline
    → Progress indicator → Updated app appears inline
```

---

## 4. App Player UX

### 4.1 Full-Screen Player

When a user opens an app from the feed or creation studio:

```
┌──────────────────────────────┐
│ ← │ Neon Space Blaster │ ⋮  │  Translucent header bar
├──────────────────────────────┤  (auto-hides after 3s)
│                              │
│                              │
│                              │
│      [Full-screen app        │
│       rendered in WebView]   │
│                              │
│                              │
│                              │
│                              │
├──────────────────────────────┤
│  ❤️ 234  💬 18  🔀 12  📤   │  Action bar
└──────────────────────────────┘  (auto-hides after 3s)
```

- Header and action bar auto-hide after 3 seconds of play
- Swipe down from top or tap top-of-screen to reveal header
- Tap bottom area to reveal action bar
- Back button returns to feed (with "are you sure?" if multiplayer is active)

### 4.2 Multiplayer Launch

When opening a multiplayer app:

```
┌──────────────────────────────┐
│  Neon Space Blaster          │
│  by @alex                    │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │    [App Preview]       │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │  ▶ Play Solo           │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  👥 Play with Friends  │  │
│  └────────────────────────┘  │
│                              │
│  🏆 Leaderboard             │
│  1. @sarah — 15,230         │
│  2. @mike — 12,100          │
│  3. @alex — 9,800           │
│                              │
└──────────────────────────────┘
```

"Play with Friends" → Lobby screen → Share invite link or wait for friends → Start game.

---

## 5. Remix Flow

### 5.1 Entry Point

Remix button is visible on every app in the player action bar and on app detail pages.

### 5.2 Sequence

```
User taps "Remix" (🔀)
    │
    ▼
┌──────────────────────────────┐
│  Remix: Neon Space Blaster   │
│  by @alex                    │
│                              │
│  "What would you like to     │
│   change?"                   │
│                              │
│  ┌──────────────────────┐    │
│  │ 🎨 Change the theme  │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ ➕ Add new features   │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 🔄 Make it my own    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ ✍️ Describe changes   │    │
│  └──────────────────────┘    │
│                              │
├──────────────────────────────┤
│  "Make it underwater..."     │
└──────────────────────────────┘
```

This opens a new Creation Session with `source_app_id` set. The original app's HTML bundle is passed to the Generator as context, and the user's remix instructions are processed through the full pipeline.

### 5.3 Lineage Display

On the published remix's detail page:

```
Remixed from:
  Neon Space Blaster → by @alex
    └── Originally from:
        Space Invader Classic → by @jordan
```

Tapping any ancestor navigates to that app's page.

---

## 6. Notification Patterns

| Event | Notification Text | Deep Link |
|---|---|---|
| New follower | "@alex followed you" | Follower's profile |
| Like on app | "@alex liked your Neon Snake" | App player |
| Comment on app | "@alex commented: 'so fun!'" | Comment thread |
| Remix of your app | "@alex remixed your Neon Snake into Ocean Snake" | Remix app |
| Multiplayer invite | "@alex invited you to play Neon Snake" | Lobby |
| Generation complete | "Your app is ready! 🎮 Tap to play." | Creation Studio |
| Generation failed | "We couldn't build that one. Tap to try again." | Creation Studio |
