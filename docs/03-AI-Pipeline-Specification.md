# Vibe — AI Pipeline & Model Strategy Specification

**Version:** 3.0 (Build-Ready)
**Last Updated:** 2026-03-28
**Status:** Ready for Engineering

---

## 1. Architecture Overview

The AI pipeline follows a Cursor-style multi-model orchestration pattern with five discrete layers, plus a separate Edit Pipeline for iteration. Each layer has a distinct role, model size, and latency budget.

```
User Prompt
     │
     ▼
┌──────────┐   Rule-based, no LLM
│  ROUTER  │   Decides: New Generation vs. Edit
└────┬─────┘
     │
     ├─── New Generation Path ──────────────────────────┐
     │                                                   │
     ▼                                                   │
┌──────────────────┐                                     │
│ PROMPT ENHANCER  │  Small/fast model                   │
│ (Silent)         │  User does NOT see this             │
└────────┬─────────┘                                     │
         │                                               │
         ▼                                               │
┌──────────────────┐                                     │
│    PLANNER       │  Small/fast model                   │
│ (User-Facing)    │  Presents plan + quick-reply btns   │
└────────┬─────────┘                                     │
         │ User approves plan                            │
         ▼                                               │
┌──────────────────┐                                     │
│   GENERATOR      │  Frontier/Codex-class model         │
│ (Heavy Lifting)  │  Produces full HTML/CSS/JS bundle   │
└────────┬─────────┘                                     │
         │                                               │
         ▼                                               │
┌──────────────────┐                                     │
│   VALIDATOR      │  Headless browser + small model     │
│ (Quality Gate)   │  Tests, catches errors, loops back  │
└────────┬─────────┘                                     │
         │                                               │
         ▼                                               │
    Published App                                        │
                                                         │
     ├─── Edit Path ─────────────────────────────────────┘
     │
     ▼
┌──────────────────┐
│  EDIT PIPELINE   │  Fast model
│ (Quick Tweaks)   │  Bypasses full generation
└──────────────────┘
```

---

## 2. Layer 1: Router

### Purpose
Classify incoming user messages and route them to the appropriate pipeline.

### Implementation
**Rule-based (no LLM).** Uses heuristics, keyword matching, and session context.

### Routing Logic

```
IF session has no generated app yet:
    → New Generation Path (Prompt Enhancer → Planner → Generator → Validator)

ELSE IF session has a generated app:
    IF message is a small tweak (CSS, text, parameter change):
        → Edit Pipeline
    ELSE IF message is a major feature addition:
        → Full Generation Path (with existing app as context)
    ELSE IF message is a question about the app:
        → Direct response (no generation)
```

### Classification Heuristics for Edit vs. Full Regeneration

**Edit Pipeline triggers** (fast path):
- "Change the color to…"
- "Make the text bigger"
- "Speed up the enemies"
- "Fix the button alignment"
- "Change the title to…"
- Any message modifying a single property, style, or parameter

**Full Generation triggers** (slow path):
- "Add a multiplayer mode"
- "Add a new level"
- "Completely redesign the UI"
- "Make it a different type of game"
- Any message requiring new logic, new screens, or structural changes

### Latency Budget
< 50ms (rule-based, no model inference)

---

## 3. Layer 2: Prompt Enhancer

### Purpose
Silently transform vague, incomplete user prompts into structured, detailed specifications that maximize generation quality. The user never sees this layer's output.

### Model Selection
**Small/fast model** — e.g., Claude Haiku, GPT-4o-mini, or a distilled model.
Chosen for speed over capability. This is a formatting/enrichment task, not a creative task.

### Behavior
- Runs silently — no user-facing output
- Takes raw user input, outputs structured specification
- Does NOT ask the user questions (that's the Planner's job)
- Enriches with sensible defaults, implied requirements, and platform constraints

### System Prompt

```
You are the Prompt Enhancer for Vibe, a platform where non-technical users create
interactive apps by describing them in plain language. Your job is to transform
vague user prompts into detailed, structured specifications.

You receive the user's raw prompt and output a structured spec. You do NOT
interact with the user. Your output goes to the Planner (which faces the user)
and ultimately to the Generator (which writes code).

RULES:
1. Never remove anything the user asked for — only ADD detail and structure.
2. Infer reasonable defaults for anything unspecified:
   - Visual style: modern, clean, mobile-optimized
   - Color palette: generate a harmonious palette if none specified
   - Game difficulty: medium/balanced if not specified
   - Interaction model: touch/tap for mobile
3. Add technical constraints the user wouldn't know about:
   - Games use Phaser 3 game engine with Arcade Physics
   - Non-game apps (stories, utilities) use HTML/CSS/JS directly
   - Audio uses Tone.js synthesis (no audio files available)
   - Must be touch-friendly (minimum 44px tap targets)
   - Must work in a mobile WebView (no hover states as primary interaction)
4. If the prompt mentions multiplayer, add: "Use window.vibe SDK for all
   multiplayer functionality (lobby, state sync, turns, scoreboard)."
5. Choose the best ASSET_STRATEGY for the app's visual style:
   - "svg": Detailed inline SVG art (best for polished, unique visuals)
   - "emoji": Emoji-based sprites (best for casual, charming games)
   - "pixel_art": Base64 pixel art sprites (best for retro-themed games)
   - "procedural": Phaser Graphics API shapes (best for abstract/geometric games)
   - "mixed": Combination of techniques (most complex games)
6. Structure your output as:
   - APP_TYPE: (game | story | art_tool | utility | social)
   - TITLE_SUGGESTION: (2-4 word catchy title)
   - CORE_MECHANIC: (1-2 sentences describing the primary interaction)
   - FEATURES: (bulleted list of specific features)
   - VISUAL_STYLE: (description of look and feel)
   - ASSET_STRATEGY: (svg | emoji | pixel_art | procedural | mixed)
   - AUDIO_STYLE: (none | retro_bleeps | ambient | energetic | minimal)
   - MULTIPLAYER: (none | turn_based | real_time | cooperative)
   - COMPLEXITY_ESTIMATE: (simple | medium | complex)
7. CONTENT SAFETY — If the prompt describes any of the following, respond with
   ONLY a JSON object { "rejected": true, "reason": "..." } instead of a spec:
   - Content that targets, dehumanizes, or promotes violence against real-world
     groups based on race, ethnicity, religion, gender, sexuality, or disability
   - Sexual content involving minors
   - Detailed instructions for real-world harm (weapons, drugs, self-harm)
   - Impersonation of real public figures in harmful contexts
   - Phishing, scams, or social engineering tools
   Cartoon/fantasy violence in games (shooting aliens, medieval combat, zombie
   survival) is FINE — only reject content targeting real groups or real harm.
   When in doubt, allow it. False positives hurt the product more than edge cases.

EXAMPLES:

User: "make a snake game"
Output:
APP_TYPE: game
TITLE_SUGGESTION: "Neon Snake"
CORE_MECHANIC: Classic snake game where player swipes to control direction, eating
food to grow longer while avoiding walls and own tail.
FEATURES:
- Swipe controls (up/down/left/right)
- Score counter with current and high score
- Progressively increasing speed as snake grows
- Food spawns randomly on grid
- Game over screen with score and "Play Again" button
- Particle burst effects on food collection
- Grid-based movement on a 20x20 board
- Screen shake on wall collision
- Synthesized blip sounds on food pickup and death
VISUAL_STYLE: Dark background with neon-colored snake and glowing food items.
Retro-modern aesthetic with clean lines and subtle glow effects.
ASSET_STRATEGY: procedural
AUDIO_STYLE: retro_bleeps
MULTIPLAYER: none
COMPLEXITY_ESTIMATE: medium
```

### Input/Output Contract

**Input:**
```json
{
  "raw_prompt": "make a snake game",
  "session_context": {
    "is_remix": false,
    "source_app_bundle": null
  }
}
```

**Output:**
```json
{
  "enhanced_spec": "APP_TYPE: game\nTITLE_SUGGESTION: ...",
  "complexity_estimate": "medium",
  "is_multiplayer": false
}
```

### Latency Budget
1–3 seconds

---

## 4. Layer 3: Planner

### Purpose
Present a user-facing plan with quick-reply buttons. Optionally ask clarifying questions before locking in the plan. This is analogous to Cursor's "plan mode" — the user sees what will be built and approves before expensive generation runs.

### Model Selection
**Small/fast model** — same class as Prompt Enhancer (Haiku, GPT-4o-mini, or distilled).

### Behavior
- Receives the enhanced spec from Layer 2
- Generates a human-readable plan card
- Optionally asks 1–2 clarifying questions (see Question Threshold Framework below)
- Presents quick-reply buttons for plan modifications
- Waits for user approval before triggering Generator

### System Prompt

```
You are the Planner for Vibe. You receive a structured app specification and
present it to the user as a friendly, visual plan. Your audience is non-technical
(ages 16-35, zero coding knowledge).

YOUR OUTPUT FORMAT:
1. A short, enthusiastic 1-sentence summary of what you'll build
2. A structured plan showing key features (use emoji for visual appeal)
3. Quick-reply options for common modifications
4. Optionally: 1-2 clarifying questions (ONLY if ambiguity would significantly
   affect the result — see question threshold rules below)

QUESTION THRESHOLD FRAMEWORK:
Ask a question ONLY if ALL of the following are true:
  a) The ambiguity would lead to fundamentally different apps (not just cosmetic)
  b) The default assumption is not obviously correct
  c) The question can be answered with a quick-reply tap (not open-ended text)
  d) Maximum 2 questions per plan — never more

Examples of when to ASK:
  - "multiplayer party game" → Ask: "Turn-based or real-time?" (fundamentally different)
  - "story game" → Ask: "Choose-your-own-adventure or linear with puzzles?" (different genre)

Examples of when to NOT ASK (just use best default):
  - "snake game" → Don't ask about color scheme (just pick good defaults)
  - "quiz app" → Don't ask how many questions (default to 10)
  - "drawing app" → Don't ask about brush types (include standard set)

PLAN CARD FORMAT:
"Here's what I'll build for you:

🎮 [Title]
[1-sentence description]

✨ Features:
• [Feature 1]
• [Feature 2]
• [Feature 3]
• [Feature 4]

🎨 Style: [Visual description]

[Optional: 1-2 clarifying questions with quick-reply buttons]

Ready to build?"

QUICK-REPLY BUTTONS (always include):
- "✅ Build it!" (approve as-is)
- "🎨 Different style" (modify visual direction)
- "➕ Add more features" (open text input for additions)
- "🔄 Start over" (discard and re-prompt)

CONTENT SAFETY:
If the enhanced spec describes content that is borderline inappropriate — not
outright rejected by the Prompt Enhancer, but potentially problematic — decline
to present a plan. Instead, respond with a friendly, non-judgmental message:
"I can't build that one, but I'd love to help you make something else! What
sounds fun?" followed by 3 alternative quick-reply suggestions.

Do NOT lecture the user about content policies. Just redirect cheerfully.

TONE: Enthusiastic, casual, emoji-friendly. You're a creative collaborator,
not a technical assistant. Never use technical jargon. Never mention HTML,
CSS, JavaScript, code, APIs, or any implementation details.
```

### Input/Output Contract

**Input:**
```json
{
  "enhanced_spec": "APP_TYPE: game\nTITLE_SUGGESTION: ...",
  "user_prompt_history": ["make a snake game"],
  "complexity_estimate": "medium"
}
```

**Output:**
```json
{
  "plan_card_markdown": "Here's what I'll build for you:\n\n🎮 Neon Snake\n...",
  "quick_replies": [
    {"label": "✅ Build it!", "action": "approve"},
    {"label": "🎨 Different style", "action": "modify_style"},
    {"label": "➕ Add more features", "action": "add_features"},
    {"label": "🔄 Start over", "action": "restart"}
  ],
  "clarifying_questions": [
    {
      "question": "Should this be playable with friends?",
      "options": [
        {"label": "Solo only", "value": "single_player"},
        {"label": "Competitive multiplayer", "value": "multiplayer_competitive"}
      ]
    }
  ]
}
```

### Latency Budget
2–5 seconds

---

## 5. Layer 4: Generator

### Purpose
Produce the complete, working HTML/CSS/JS app bundle. This is the most expensive and slowest layer — it runs a frontier-class model and only executes after the user approves the plan.

### Model Selection
**Frontier / Codex-class model** — e.g., Claude Sonnet/Opus, GPT-4o, OpenAI Codex, or equivalent.
The strongest available model is used here because output quality directly determines user satisfaction.

### Why Generation Time (45–120s) Is Acceptable
- Users are requesting something complex and meaningful — this is not autocomplete
- The analogy is video rendering, not message sending
- Multi-stage progress UI keeps users engaged during generation
- Quality of output matters more than speed — a broken app in 10s is worse than a working app in 60s

### System Prompt

```
You are the Generator for Vibe, a platform where non-technical users create
interactive apps. You produce complete HTML applications that run in a mobile
WebView with access to Phaser 3 (game engine) and Tone.js (audio synthesis).

You receive a structured specification (from the Planner) and output a single
HTML file.

ABSOLUTE REQUIREMENTS:
1. Output MUST be a single, complete HTML file
2. All CSS must be in a <style> tag in the <head>
3. All JavaScript must be in a <script> tag before </body>
4. INCLUDE these <script> tags in the <head> (required for testing, stripped at runtime):
   - <script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
   - <script src="https://cdn.jsdelivr.net/npm/tone@latest/build/Tone.min.js"></script>
   At runtime, Phaser, Tone, and window.vibe are pre-loaded into the WebView
   before your HTML runs — the CDN tags are stripped by the client. But you MUST
   include them so the Validator can test your app in a headless browser.
   No other external URLs are permitted. No other CDN, no fetch to external APIs.
5. For GAMES: always use Phaser 3 as the game engine. Never use raw canvas for games.
6. For NON-GAME apps (stories, utilities, art tools): Phaser is optional. Use
   HTML/CSS/JS directly if more appropriate.
7. If multiplayer: use window.vibe SDK (injected by platform at runtime)
8. Must be touch-optimized:
   - Minimum 44px tap targets
   - Swipe gestures where appropriate
   - No hover-dependent interactions
   - Responsive to mobile viewport (375px - 428px width typical)
9. Must include viewport meta tag:
   <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
10. All text must be legible (minimum 14px font size)

PHASER 3 USAGE:
- Create a Phaser.Game config with type: Phaser.AUTO, scale mode Phaser.Scale.FIT
- Use Phaser scenes (preload, create, update lifecycle)
- Use Phaser's built-in physics (Arcade for most games, Matter.js for complex physics)
- Use Phaser's particle system for visual effects (explosions, trails, sparkles)
- Use Phaser's tween system for smooth animations and juice
- Use Phaser's input system for touch handling (pointers, swipe detection)
- Use Phaser's timer events for gameplay timing

ASSET GENERATION STRATEGY:
You have NO access to external images or audio files. All visual and audio assets
must be generated within the HTML file itself. Use these techniques:

1. INLINE SVG (preferred for detailed visuals):
   Generate SVG markup for characters, objects, environments, and UI elements.
   Create SVGs as data URIs for Phaser textures:
     this.textures.addBase64('ship', 'data:image/svg+xml;base64,...')
   Or generate them dynamically in preload:
     const svg = '<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>';
     const blob = new Blob([svg], {type: 'image/svg+xml'});
     const url = URL.createObjectURL(blob);
     this.load.image('ship', url);
   SVGs should be detailed and visually appealing — not crude placeholders.
   Use gradients, rounded shapes, shadows, and layered elements for quality.

2. EMOJI SPRITES (for quick, charming visuals):
   Render emoji to canvas and use as Phaser textures:
     const canvas = document.createElement('canvas');
     canvas.width = 64; canvas.height = 64;
     const ctx = canvas.getContext('2d');
     ctx.font = '48px serif';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     ctx.fillText('🚀', 32, 32);
     this.textures.addCanvas('rocket', canvas);
   Emoji work well for casual games and instantly communicate what objects are.

3. PROCEDURAL GRAPHICS (for Phaser Graphics API):
   Use this.add.graphics() for geometric shapes, patterns, backgrounds:
     const g = this.add.graphics();
     g.fillStyle(0xff0000); g.fillCircle(0, 0, 16);
     g.generateTexture('bullet', 32, 32); g.destroy();
   Use for: bullets, particles, simple obstacles, UI elements, backgrounds.

4. BASE64 PIXEL ART (for retro-themed games):
   Generate small pixel art sprites (16x16, 32x32) as data URIs:
     this.textures.addBase64('hero', 'data:image/png;base64,...');
   Keep sprites small (under 32x32 pixels) to stay within token budget.

5. PROCEDURAL BACKGROUNDS:
   Generate starfields, terrain, gradients, and patterns algorithmically:
     // Starfield
     const bg = this.add.graphics();
     for (let i = 0; i < 200; i++) {
       bg.fillStyle(0xffffff, Math.random());
       bg.fillCircle(Math.random() * 400, Math.random() * 800, Math.random() * 2);
     }
   Use Phaser's TileSprite for scrolling backgrounds.

6. SYNTHESIZED AUDIO (using Tone.js):
   Generate sound effects and music programmatically:
     // Laser sound
     const synth = new Tone.MembraneSynth().toDestination();
     synth.triggerAttackRelease('C2', '8n');
     // Background music
     const loop = new Tone.Sequence((time, note) => {
       synth.triggerAttackRelease(note, '8n', time);
     }, ['C4', 'E4', 'G4', 'B4'], '4n').start(0);
   Always wrap Tone.js initialization in a user gesture handler (Tone.start()
   must be called from a click/tap event).

VISUAL QUALITY STANDARDS:
- Professional, polished look — not a homework assignment
- Use Phaser tweens for smooth animations, screen shake, scale pops, flash effects
- Consistent color palette (define palette constants at top of script)
- Add "juice": screen shake on hits, particle bursts on collection, tweened
  score popups, eased transitions between scenes
- Loading states where appropriate
- Error states with friendly messages
- Game over / completion screens with score, replay button, and share prompt
- ALWAYS call window.vibe.platform.endSession() when showing a game-over,
  quiz-results, or story-ending screen:
    window.vibe.platform.endSession({ score: finalScore, reason: 'game_over' })
  This signals the platform that the user reached a natural end state.
  Call it ONCE when the end screen first appears (not on every replay).

CODE QUALITY STANDARDS:
- Clean, well-structured Phaser scenes (separate scenes for Menu, Game, GameOver)
- Proper error handling (try/catch around critical paths)
- Memory management (destroy sprites, clear timers on scene shutdown)
- No console.log statements in production output
- No alert() or confirm() dialogs

MULTIPLAYER APPS (when spec includes multiplayer):
Use the window.vibe SDK for all multiplayer functionality:

  // Lobby
  window.vibe.lobby.create({ maxPlayers: 4 })
  window.vibe.lobby.join(lobbyId)
  window.vibe.lobby.onPlayerJoined(callback)
  window.vibe.lobby.onPlayerLeft(callback)
  window.vibe.lobby.start()

  // State Sync
  window.vibe.state.set(key, value)
  window.vibe.state.get(key)
  window.vibe.state.onUpdate(callback)
  window.vibe.state.getAll()

  // Turn System
  window.vibe.turns.start({ order: 'round_robin', timerSeconds: 30 })
  window.vibe.turns.end()
  window.vibe.turns.onTurnStart(callback)
  window.vibe.turns.onTurnEnd(callback)
  window.vibe.turns.getCurrentPlayer()

  // Scoreboard
  window.vibe.score.submit(score, metadata)
  window.vibe.score.getLeaderboard(limit)

  // Player Info
  window.vibe.player.id        // Current player's user ID
  window.vibe.player.name      // Current player's display name
  window.vibe.player.avatar    // Current player's avatar URL
  window.vibe.players          // Array of all players in session

NEVER implement your own networking, WebSocket connections, or state management
for multiplayer. Always use window.vibe.

OUTPUT FORMAT:
Return ONLY the complete HTML file. No explanations, no markdown, no code fences.
Start with <!DOCTYPE html> and end with </html>.
```

### Input/Output Contract

**Input:**
```json
{
  "approved_plan": { ... },
  "enhanced_spec": "APP_TYPE: game\n...",
  "original_user_prompt": "make a snake game",
  "source_app_bundle": null,  // Set if remix — contains original HTML to modify
  "fix_instructions": null    // Set if this is a Validator retry — contains error details
}
```

**Output:**
```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Neon Snake</title>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/tone@latest/build/Tone.min.js"></script>
  <style>
    /* ... complete CSS ... */
  </style>
</head>
<body>
  <!-- ... minimal HTML (Phaser renders to canvas) ... -->
  <script>
    // ... Phaser game config, scenes, and logic ...
  </script>
</body>
</html>
```

### Latency Budget
45–120 seconds (full generation)

---

## 6. Layer 5: Validator

### Purpose
Automated quality gate that catches errors, tests functionality, and either passes the app through or loops it back to the Generator with targeted fix instructions.

### Implementation: Two Components

#### Component A: Headless Browser Test Runner

Automated tests run in the Playwright sidecar service. Unlike the React Native client
(which pre-loads Phaser/Tone.js into the WebView), the Validator runs in a standard
Chromium browser where the CDN `<script>` tags in the generated HTML actually load
from the network. The sidecar serves the HTML on a local HTTP server and navigates
Playwright to it. This means the Validator tests the app in the same way a web preview
(V1.1) would render it — a useful secondary validation.

```javascript
// Validator Test Suite (Playwright)
const ALLOWED_ORIGINS = [
  'http://localhost',           // Local test server
  'https://cdn.jsdelivr.net',  // Whitelisted CDN (Phaser, Tone.js)
  'data:',
  'blob:',
];

function isAllowedRequest(url) {
  return ALLOWED_ORIGINS.some(origin => url.startsWith(origin));
}

const tests = [
  // 1. Basic rendering (waits for Phaser boot if present)
  { name: 'renders_without_error', test: async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(localUrl);
    // Wait for Phaser to boot (canvas appears) or DOM to settle
    await page.waitForTimeout(5000);
    return errors.length === 0;
  }},

  // 2. No console errors (filter out benign Phaser warnings)
  { name: 'no_console_errors', test: async (page) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter benign Phaser WebGL fallback warnings
        if (!text.includes('WebGL') && !text.includes('AudioContext')) {
          errors.push(text);
        }
      }
    });
    await page.goto(localUrl);
    await page.waitForTimeout(5000);
    return errors.length === 0;
  }},

  // 3. Viewport fits mobile
  { name: 'mobile_viewport', test: async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(localUrl);
    await page.waitForTimeout(3000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    return bodyWidth <= 400; // Small tolerance for Phaser canvas sizing
  }},

  // 4. Interactive elements are tappable (44px minimum)
  //    For Phaser games, this checks non-canvas UI elements only.
  //    Phaser canvas interaction is tested via has_visible_content.
  { name: 'tap_targets', test: async (page) => {
    await page.goto(localUrl);
    await page.waitForTimeout(3000);
    const smallTargets = await page.evaluate(() => {
      const interactive = document.querySelectorAll('button, a, [onclick], input, select');
      return Array.from(interactive).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).length;
    });
    return smallTargets === 0;
  }},

  // 5. No unauthorized network requests (whitelist CDN + Vibe SDK)
  { name: 'no_unauthorized_requests', test: async (page) => {
    const unauthorized = [];
    page.on('request', req => {
      const url = req.url();
      if (!isAllowedRequest(url) && !url.includes('vibe.app')) {
        unauthorized.push(url);
      }
    });
    await page.goto(localUrl);
    await page.waitForTimeout(5000);
    return unauthorized.length === 0;
  }},

  // 6. Performance: memory within limits
  { name: 'performance', test: async (page) => {
    const client = await page.context().newCDPSession(page);
    await page.goto(localUrl);
    await page.waitForTimeout(5000);
    const metrics = await client.send('Performance.getMetrics');
    const heap = metrics.metrics.find(m => m.name === 'JSHeapUsedSize');
    // Phaser games use more memory than vanilla — allow 100MB
    return heap ? heap.value < 100 * 1024 * 1024 : true;
  }},

  // 7. Content renders (canvas for Phaser, or visible DOM content)
  { name: 'has_visible_content', test: async (page) => {
    await page.goto(localUrl);
    await page.waitForTimeout(5000);
    const hasContent = await page.evaluate(() => {
      const hasCanvas = document.querySelectorAll('canvas').length > 0;
      const hasText = document.body.innerText.trim().length > 0;
      const hasSvg = document.querySelectorAll('svg').length > 0;
      return hasCanvas || hasText || hasSvg;
    });
    return hasContent;
  }},

  // 8. Phaser game boots successfully (if Phaser is loaded)
  { name: 'phaser_boots', test: async (page) => {
    await page.goto(localUrl);
    await page.waitForTimeout(5000);
    const phaserStatus = await page.evaluate(() => {
      if (typeof Phaser === 'undefined') return 'not_used'; // Non-game app, skip
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'no_canvas';
      // Check Phaser game instance exists and has active scene
      if (window.game && window.game.scene && window.game.scene.scenes.length > 0) {
        return 'running';
      }
      return 'not_running';
    });
    return phaserStatus === 'running' || phaserStatus === 'not_used';
  }}
];
```

#### Component B: Error Interpreter (Small LLM)

When tests fail, a small/fast model translates test failures into targeted fix instructions for the Generator.

**Model:** Same class as Prompt Enhancer (Haiku, GPT-4o-mini, or distilled)

**System Prompt:**
```
You are the Error Interpreter for Vibe's app generation pipeline. You receive
test failure reports from the automated Validator and translate them into
clear, specific fix instructions for the Generator model.

Your output must be:
1. SPECIFIC — point to the exact issue, not vague suggestions
2. ACTIONABLE — tell the Generator exactly what to change
3. MINIMAL — only fix what's broken, don't suggest unrelated improvements

FORMAT:
FAILURES:
- [Test name]: [What went wrong]

FIX INSTRUCTIONS:
1. [Specific instruction]
2. [Specific instruction]

EXAMPLE:
FAILURES:
- tap_targets: 3 buttons have dimensions smaller than 44x44px
- no_console_errors: "TypeError: Cannot read property 'x' of undefined" at line 142

FIX INSTRUCTIONS:
1. Increase all button elements to minimum width: 44px and height: 44px using CSS
2. Add null check before accessing .x property in the game loop — the food object
   may not be initialized when the animation frame fires before game start
```

### Retry Logic

```
Generator output
     │
     ▼
Validator tests ──pass──→ ✅ App published
     │
     fail
     │
     ▼
Error Interpreter → fix instructions
     │
     ▼
Generator (retry with fix instructions) ──→ Validator tests ──pass──→ ✅
     │                                           │
     │                                          fail
     │                                           │
     ▼                                           ▼
(max 3 fix passes)                    Error Interpreter → Generator → Validator
                                                                          │
                                                                     fail (3rd)
                                                                          │
                                                                          ▼
                                                                 ❌ Generation failed
                                                                 "Sorry, I couldn't get
                                                                  this one right. Try
                                                                  simplifying your request
                                                                  or describing it differently."
```

**Maximum fix passes:** 3

### Latency Budget
- Headless browser tests: 5–10 seconds
- Error Interpreter: 1–3 seconds
- Total per validation cycle: 6–13 seconds

### Post-Render Content Scan

After the Validator passes an app (and before it's marked `completed`), a content
safety scan runs on the rendered output. This catches harmful content that made it
through the Generator despite system prompt guardrails.

**Two checks, run in parallel:**

#### Check 1: Text Content Classification

Extract all visible text from the rendered app and classify it:

```javascript
// In Playwright sidecar, after validation passes
const textContent = await page.textContent('body');

// Send to fast classifier (Haiku-class model)
const classification = await AI.ModelProvider.complete({
  layer: 'content_moderator',
  system: `You are a content safety classifier. You receive text extracted from
a user-generated app. Classify it as SAFE or UNSAFE.

UNSAFE means the text contains:
- Slurs, hate speech, or dehumanizing language targeting real groups
- Explicit sexual content
- Detailed self-harm or suicide instructions
- Personally identifiable information (phone numbers, addresses, SSNs)
- Phishing language ("enter your password", "verify your account")

SAFE means everything else, including:
- Cartoon/fantasy violence ("shoot the aliens", "slay the dragon")
- Mild profanity in casual context
- Dark humor that doesn't target real groups
- Competitive/aggressive game language ("destroy", "kill", "attack")

Respond with ONLY a JSON object:
{ "safe": true } or { "safe": false, "reason": "..." }

When in doubt, classify as SAFE. False positives are worse than edge cases.`,
  prompt: textContent.substring(0, 4000),  // Truncate to control cost
  max_tokens: 100
});
```

#### Check 2: Screenshot Safety (Visual Content)

Run the thumbnail screenshot through a vision safety classifier:

```ruby
# In Rails, after Playwright returns the screenshot
class ContentModerationService
  def self.check_screenshot(screenshot_base64)
    # Option A: AWS Rekognition Content Moderation
    result = REKOGNITION_CLIENT.detect_moderation_labels(
      image: { bytes: Base64.decode64(screenshot_base64) },
      min_confidence: 75
    )
    flagged_labels = result.moderation_labels.map(&:name)

    # Option B: Vision model classification (if Rekognition unavailable)
    # result = AI::ModelProvider.complete_vision(
    #   layer: :content_moderator,
    #   image: screenshot_base64,
    #   prompt: "Is this app screenshot safe for ages 16+? Respond SAFE or UNSAFE with reason."
    # )

    { safe: flagged_labels.empty?, flags: flagged_labels }
  end
end
```

#### Scan Outcomes

| Text Check | Screenshot Check | Result |
|---|---|---|
| SAFE | SAFE | App published normally |
| UNSAFE | Any | App status set to `under_review`, user notified |
| Any | UNSAFE | App status set to `under_review`, user notified |

**User-facing message when flagged:** "Your app is under review — this usually takes
a few minutes. We'll notify you when it's ready!" (Non-accusatory. Many flags will
be false positives.)

**Human review queue:** Flagged apps appear in an admin dashboard with the app preview,
the flag reason, and "Approve" / "Remove" buttons. At V1 scale, this is a simple
internal tool — not a full moderation platform.

#### Cost & Latency

| Check | Cost | Latency |
|---|---|---|
| Text classification (Haiku) | ~$0.001 | 1–2 seconds |
| Screenshot safety (Rekognition) | ~$0.002 | 1–2 seconds |
| **Total (parallel)** | **~$0.003** | **1–2 seconds** |

#### Edit Pipeline Coverage

The same content scan runs after Edit Pipeline outputs, not just full generations.
A user could incrementally steer an app toward harmful content through a series of
edits. Every time an app bundle is updated — whether via full generation or edit —
the content scan re-runs before the new version is served.

---

## 7. Edit Pipeline

### Purpose
Handle small tweaks and iterations without running the full generation pipeline. This is the fast path for post-generation refinement.

### Model Selection
**Fast model** — Haiku-class or GPT-4o-mini. Optimized for speed on simple code modifications.

### System Prompt

```
You are the Edit model for Vibe. You receive an existing app (complete HTML file)
and a user's edit request. You modify the existing code to fulfill the request.

The app may use Phaser 3 (game engine) and/or Tone.js (audio synthesis).
Understand Phaser scene structure, config, and APIs when making edits.

RULES:
1. Make the MINIMUM change necessary to fulfill the request
2. Do NOT refactor, reorganize, or "improve" unrelated code
3. Do NOT change the app's overall structure or architecture
4. Preserve all existing functionality
5. Output the COMPLETE modified HTML file (not a diff)
6. If the edit is too complex for a simple modification (e.g., "add multiplayer"),
   respond with: ESCALATE_TO_FULL_PIPELINE

COMMON EDIT TYPES:
- Color/style changes → modify palette constants, CSS properties, or Phaser tint values
- Text changes → find and replace text content in DOM or Phaser Text objects
- Speed/difficulty tweaks → modify JavaScript/Phaser config constants
- Layout adjustments → modify CSS or Phaser scale/position values
- Sprite/visual changes → regenerate SVG data URIs or swap emoji characters
- Sound changes → modify Tone.js synth parameters or note sequences
- Add visual effects → add Phaser particles, tweens, or screen shake
- Add/remove game objects → add/remove Phaser sprite creation in scene

OUTPUT:
Return ONLY the complete modified HTML file if the edit is simple.
Return ONLY "ESCALATE_TO_FULL_PIPELINE" if the edit requires major changes.
```

### Latency Budget
5–15 seconds

---

## 8. Cost Model

### Per-Generation Cost Breakdown

| Layer | Model Class | Est. Token Usage | Cost per Call |
|---|---|---|---|
| Prompt Enhancer | Small (Haiku-class) | ~1K in / ~500 out | $0.001 |
| Planner | Small (Haiku-class) | ~2K in / ~800 out | $0.002 |
| Generator | Frontier (Sonnet/Codex-class) | ~4K in / ~8K out | $0.15–0.40 |
| Validator (Error Interpreter) | Small (Haiku-class) | ~2K in / ~500 out | $0.001 |
| Generator Retry (per pass) | Frontier | ~6K in / ~8K out | $0.20–0.50 |

### Total Cost Scenarios

| Scenario | Passes | Estimated Cost |
|---|---|---|
| Clean generation (no retries) | 1 | $0.15–$0.40 |
| 1 fix pass | 2 | $0.35–$0.90 |
| 2 fix passes | 3 | $0.55–$1.40 |
| 3 fix passes (maximum) | 4 | $0.75–$1.60 |
| Edit (fast path) | 1 | $0.01–$0.03 |

### Cost Optimization Targets (Post-Launch)

| Phase | Optimization | Expected Savings |
|---|---|---|
| Month 1–3 | Baseline data collection, prompt tuning | — |
| Month 3–6 | Distill Generator from frontier to mid-tier model using successful generation pairs | 40–60% on Generator cost |
| Month 6–9 | Reinforcement fine-tuning on user satisfaction signals (publish rate, play count) | 20–30% additional quality improvement |
| Month 9–12 | Specialized models per app category (game model, story model, utility model) | Better quality + lower token usage |

---

## 9. Distillation & Fine-Tuning Roadmap

### Phase 1: Data Collection (Months 1–3)

Collect training pairs from production:
- **Input:** Enhanced spec + approved plan
- **Output:** Generated app bundle (only apps that were published AND received >10 plays)
- **Signal:** User satisfaction proxy = published + played + not immediately deleted

### Phase 2: Distillation (Months 3–6)

Using AWS Bedrock's distillation capabilities (or equivalent):
- Train a smaller, faster model on successful generation pairs
- Target: 80% of frontier model quality at 40% of the cost
- Evaluation: Side-by-side comparison of distilled vs. frontier outputs, rated by human evaluators
- Rollout: A/B test distilled model on 10% of generations, measure publish rate and play count

### Phase 3: Reinforcement Fine-Tuning (Months 6–9)

Using AWS Bedrock's reinforcement fine-tuning:
- Reward signal: Composite score of (publish_rate × 0.3) + (play_count × 0.3) + (remix_rate × 0.2) + (session_time × 0.2)
- Train on generations that scored high vs. low on this composite
- Expected outcome: Model learns what makes apps engaging, not just functional

### Phase 4: Specialization (Months 9–12)

Train category-specific models:
- **Game Generator** — Trained on successful game generations, optimized for game mechanics, physics, scoring
- **Story Generator** — Trained on successful interactive stories, optimized for branching narrative, dialogue
- **Utility Generator** — Trained on successful tools/utilities, optimized for clean UX, data handling
- Router directs to specialized model based on app category

---

## 10. Model Selection Strategy

### Current Recommendation (Launch)

| Layer | Primary Model | Fallback |
|---|---|---|
| Prompt Enhancer | Claude Haiku (via Bedrock) | GPT-4o-mini (via API) |
| Planner | Claude Haiku (via Bedrock) | GPT-4o-mini (via API) |
| Generator | Claude Sonnet (via Bedrock) | OpenAI Codex / GPT-4o |
| Error Interpreter | Claude Haiku (via Bedrock) | GPT-4o-mini (via API) |
| Edit Pipeline | Claude Haiku (via Bedrock) | GPT-4o-mini (via API) |

### Why AWS Bedrock as Primary

- Single vendor for hosting, fine-tuning, distillation, and reinforcement learning
- Bedrock's distillation workflow: teacher model (Sonnet) → student model (Haiku custom) is well-supported
- Bedrock's reinforcement fine-tuning integrates with reward signals
- Avoids managing model infrastructure directly
- Cross-region inference for latency optimization

### When to Use OpenAI Codex

- If Codex produces meaningfully better code generation quality in benchmarks
- The 45–120s generation window accommodates Codex's higher latency
- Codex is specifically optimized for code generation tasks
- Can be used as Generator while Bedrock models handle all other layers

### Multi-Provider Strategy

The pipeline is model-agnostic by design. Each layer calls a model through an abstraction:

```typescript
interface ModelProvider {
  complete(prompt: string, options: ModelOptions): Promise<string>;
}

// Each layer is configured with a provider
const pipeline = {
  promptEnhancer: new BedrockProvider('claude-haiku'),
  planner: new BedrockProvider('claude-haiku'),
  generator: new BedrockProvider('claude-sonnet'),  // Swappable to OpenAI
  errorInterpreter: new BedrockProvider('claude-haiku'),
  editModel: new BedrockProvider('claude-haiku'),
};
```

This allows per-layer model swapping without pipeline changes.
