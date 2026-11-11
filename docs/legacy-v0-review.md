# Review of the earlier attempt (v0)

The earlier attempt is preserved in git at commit `3371204`. Retrieve any file with `git show 3371204:<path>`, for example `git show 3371204:docs/11-Feed-Algorithm.md`.

## What it was

- **Pitch:** "Instagram, but every post is a playable app you made by talking to AI". It covered any kind of app (games, stories, art tools, utilities) and was mobile only.
- **Stack:** Rails 8 API, Expo / React Native client, a Playwright "validator" sidecar, a `window.vibe` SDK, Firebase Realtime Database, Google Cloud Storage, and AWS Bedrock (Claude 3 Haiku and Claude 3.5 Sonnet), hosted on Render.
- **Docs:** 13 spec documents (about 265 KB).
- **History:** the whole repo, code and docs, was generated between 7 and 9 April 2026. Nothing in it suggests real users ever touched it.

## Why the code was dropped

| Problem | Where | Consequence |
|---|---|---|
| Multiplayer, shared state and scores were never wired up. The player answered every such call with an empty `{}`. | `apps/mobile/app/app/[id].tsx` | The headline differentiator did not exist. |
| The validator's console-error check attached its listener after the page had loaded, then read it at once. | `validator/src/validate.js` | That check always passed. |
| Remix sent the bundle's URL to the model as "the app to modify", where the model needed the source code. | `api/app/jobs/generate_from_plan_job.rb` | Remix could not have worked. |
| Generation cost was hard-coded to $0.30. | same file | Cost reporting was fiction. |
| Edit-vs-regenerate routing used regexes such as `/change.*to/i`. | `api/app/services/ai/router.rb` | Almost any message counted as an "edit". |
| Phaser, Tone.js and the SDK were to be bundled into the app binary. | `docs/04`, `docs/10` T21 | Every published game would depend on whatever versions the installed app shipped. Upgrading the app could break old games, or the libraries could never be upgraded. |
| Untrusted game code ran in the same JavaScript context as the SDK bridge and the player's identity. Messages into the WebView were escaped only for single quotes. | `apps/mobile/services/webview.ts`, player screen | Any game could forge bridge messages. Once multiplayer state flowed between players, one player's data could inject script into another player's game. |
| Generation was a single model call capped at 16k output tokens, with no tool use and only load-time checks. | `api/app/services/ai/generator.rb` | No way to playtest, look at the result, or iterate. |
| Four ecosystems (Ruby, React Native, Firebase, Bedrock) for a product whose content, SDK and tooling are all JavaScript. | whole repo | Higher cost for a small team, with no matching benefit. |

## What we carry forward, as ideas

These are the parts of the thinking that held up. The new design reshapes each of them.

1. **Immutable versions with a head pointer.** Every edit makes a new version. The game points at its current one. Revert moves the pointer. Running sessions stay on the version they started with. (old PRD §5.1.1)
2. **Remix lineage.** Each game records its parent and its root. Original creators are notified and credited.
3. **The SDK surface as a checklist:** identity, lobby, shared state, turns, scores, an end-of-session signal, share, haptics and safe-area insets. The new SDK is smaller and phased; see `design/01-game-runtime.md`.
4. **Request/response over postMessage with correlation IDs and timeouts.**
5. **Signals the host measures itself.** Play time excluding time in the background, completion via an explicit end signal, early bounces, and guaranteed early exposure for new games. (old docs 06 §5.4–5.6 and 11)
6. **Play first, sign up later.** A sign-up prompt appears after two or three games. (old doc 05)
7. **The validator's list of checks:** renders without errors, no console errors, fits the viewport, no unauthorised network requests, visible content, engine boots. The new design keeps these and adds input-response and playthrough checks.
8. **Funnels:** anonymous → signed up → first creation → published → played by others → remixed. (old doc 06 §3)
9. **Moderation woven into creation:** screen intent at the prompt, scan the rendered output after every edit, accept user reports. The default of "when in doubt, allow" is revisited, because the likely audience includes teenagers.

## What we changed our minds on

| v0 position | New position | Why |
|---|---|---|
| Any kind of app | Games only | A clearer product and a narrower quality bar. Templates and checks can be genre-specific. |
| Mobile only; web preview deferred | Web first, with a native shell later | Every game is a link anyone can open and play. v0 itself called web preview "critical for viral growth" and still deferred it. |
| Fixed five-stage pipeline: router, enhancer, planner, generator, validator | One agent loop with tools (edit, build, playtest, screenshot, generate assets) working inside a template | The agent can see and test what it made. The stages become tools and checks instead of a fixed sequence. |
| All assets drawn inline (SVG, emoji, procedural) | Inline assets plus generated images and sound, all moderated | A higher visual ceiling. Image models are now good enough for sprites. |
| Libraries bundled with the app binary | Engine and SDK versions pinned per game and served from a CDN forever | Published games never break. |
| Last-write-wins key/value multiplayer as a V1 priority | Asynchronous social play first. If real-time follows, use a reducer model. | Cheaper, harder to cheat, testable, and suited to short feed sessions. See `design/04-platform-services.md`. |
| Accept Bedrock lock-in for future fine-tuning | Model-agnostic gateway | Fine-tuning is far off. Model choice changes every few months. |
| Success metrics stated as targets | Hypotheses with explicit tests | v0's targets (for example "D7 ≥ 40%") had no evidence behind them. |

## Old docs still worth reading for reference

- `docs/03-AI-Pipeline-Specification.md`: the system prompts and the cost model.
- `docs/06-Analytics-Instrumentation.md`: the event taxonomy and play-duration measurement.
- `docs/11-Feed-Algorithm.md`: the scoring function, cold-start boost and diversity rules.
