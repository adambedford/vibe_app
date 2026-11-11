# Creation: templates, agent, harness, evals, remix

Status: first draft.

## 1. The creator's experience

1. **Start.** Pick a template from a row of playable examples ("tap to jump", "drag to dodge", "match three", …), remix a game from the feed, or start blank.
2. **Describe.** "A cat jumping over cucumbers, gets faster every 10 points, pastel colours."
3. **Watch it build.** Progress appears in plain language ("Drawing the cat…", "Testing that jumping works…"). A playable preview appears as soon as the first build passes its checks, usually before the agent has finished polishing.
4. **Iterate by chat**, or by tapping suggested tweaks ("faster", "harder", "new background"). Every turn creates a version, and any version can be restored.
5. **Publish.** The full checks run (`03-checks-and-safety.md`). Then the game is shared by link, goes to followers, and enters the exploration pool.

Targets for the B2 test: the first playable preview in under 90 seconds, and most sessions reaching a game the creator chooses to publish.

## 2. Templates

A template is a complete, polished, fun game, plus the instructions an agent needs to change it safely. It is the single biggest quality lever we control.

Each template contains:

- **A core loop that is readable in about 3 seconds**, with one-touch controls. This is the hypercasual design vocabulary, the genre closest to "a feed of games".
- **Juice:** particles, screen shake, hit-stop, squash and stretch, and sound on every action. Models rarely add this unprompted, and it is much of what makes a small game feel good.
- **A difficulty curve, a fail state, instant restart, and a score.**
- **Attract mode**, so the game moves on its own in the feed before anyone touches it.
- **Full SDK integration:** `loading`, `ready`, `onPause` and `onResume`, `end`, `random`, and optionally saves and scores.
- **`TEMPLATE.md`**, which tells the agent where the knobs are: tunables in `src/config.ts`, art in `assets/` and `src/theme.ts`, entities in `src/entities/`. It also lists what must not change (the SDK calls, the input handling contract) and gives ideas for variations that work well.
- **`playtest.ts`**, a bot that plays the genre (taps at plausible moments, drags toward targets), plus invariants the checks assert, such as "the score never decreases" and "game over is reachable within 120 s of random play".

Candidate first templates, chosen to cover different input styles:

| Template | Input | Examples of what people make from it |
|---|---|---|
| One-tap timing (runner or jumper) | tap | "cat jumps cucumbers", "rocket dodges asteroids" |
| Drag to steer or dodge | drag | "fish avoids hooks", "car weaves through traffic" |
| Tap puzzle (match, merge, or sort) | tap | "merge fruits", "sort the laundry" |

Later candidates: physics flinger (drag and release), stacker, rhythm, quiz or trivia, endless climber.

**Logic and rendering are separate** (decision D25). Each template keeps game rules in a pure logic module: state plus inputs in, new state out, with seeded randomness, a fixed time step, and no clock, network or DOM. A rendering layer on top draws the state. The checks lint the logic module for these rules and run it headless in a JS isolate, far faster than real time. That gives replays, score verification, bot fuzzing and, later, a multiplayer server, with no change of language.

**Blocks under templates** (decision D26). Templates are assembled from a library of tested mechanic blocks, such as one-tap jump physics, lane spawning, combo scoring and screen-shake on hit. Each block has docs, tunables and known pitfalls. The agent can compose blocks across genres, for example a merge mechanic in a runner. Successful games are mined for new blocks, which a person reviews before they enter the library. Phaser Studio describes building its agent the same way.

**Blank start** uses a minimal template (engine, SDK lifecycle, an empty scene and a bot that only checks boot). The contract holds even from scratch.

**Template upkeep.** Templates are versioned. Improvements reach new games and remixes, never existing ones. Each template has its own eval set (section 6).

## 3. The creation agent

### Shape

One agent loop per chat turn, with tools, working on the project's files. There is no fixed pipeline. Planning, editing, testing and fixing are things the agent decides to do, bounded by budgets.

### Tools

| Tool | Purpose |
|---|---|
| `read_file`, `edit_file`, `write_file`, `list_files` | Scoped to the project. Writes to `TEMPLATE.md`, `playtest.ts` and the SDK lifecycle wiring are refused or flagged. |
| `build` | Runs esbuild in the sandbox and returns errors with file and line. |
| `playtest` | Runs the bot in headless Chromium and WebKit. Returns console errors, time to `ready`, input-response metrics, whether `end` was reached, frame-time stats, and screenshots at fixed times. |
| `screenshot` | Captures a given moment or state for visual self-review. |
| `generate_image` | Produces a sprite or background in a requested size and style, with a transparent background where needed. Moderated before it lands in `assets/`. |
| `generate_sound` | Parametric sound effects (jsfxr-style presets: jump, coin, hit, explosion). No model needed. Music comes later. |
| `ask_user` | One short question with tappable answers, used sparingly, at most once or twice per game. |
| `template_docs` | The template's `TEMPLATE.md`, plus shared notes on game feel and SDK usage. |

### Budgets and durability

- Per-turn caps on model steps (fx0 uses 64), cost and wall-clock time. The agent must leave the project in a building state when it stops.
- Turns are durable: if a worker dies mid-turn, the turn resumes and the agent is told what may have run. fx0's design (Workflow + Queues, session fencing, re-running only idempotent tools on recovery) is a good model to copy.
- Every turn that ends with a passing build creates a version. Failed turns create none, so the creator's last good version is always one tap away.

### Runtime choice

Options for the agent core:

- **libfx** (Vercel Labs `fx`): fx0 is essentially our loop for single-file pages and is Apache-2.0. Marked experimental (v0.0.x, "use at your own risk").
- **Vercel AI SDK** agent primitives: stable and widely used. We would build durability ourselves or with Workflow.
- **Claude Agent SDK**: strong tool loop, tied to one model family.

Proposal: put the agent behind our own `CreationAgent` interface (`runTurn(project, message, budgets) → stream of events`). Build the agent spike on libfx with fx0 as the reference. Run the same eval set (section 6) on an AI SDK version before committing. Models are called through a gateway so we can route by turn type, for example a cheaper model for small tweaks.

### Where code runs

Builds and playtests need a real headless browser, so they run in a sandbox: Vercel Sandbox if Chromium, WebKit and Playwright run well there, otherwise a container pool. Project files live in object storage and are synced into the sandbox for each turn. Previews in the studio use the same host runtime as the feed, pointed at a draft bundle on the games domain.

### Cost

Unknown until the spike measures it. Instrument cost per turn (model tokens, image generations, sandbox seconds) from the first prototype, and set per-user quotas before any public access.

## 4. The playtest harness

A library (`packages/checks`) used three ways: by the agent's `playtest` tool, by the publish checks, and by the offline evals.

For a given bundle and device profile (small Android, large iPhone; Chromium and WebKit):

1. **Boot:** load, wait for `ready` (budget 1.5 s on a throttled CPU profile), and record console errors and uncaught exceptions.
2. **Idle run:** 5 s with no input. Record frames.
3. **Input-response run:** the template bot plays for 60 s. Does the screen differ meaningfully from the idle run? Do inputs cause visible changes within about 100 ms?
4. **Playthrough:** is `end` reached? Do the template invariants hold?
5. **Lifecycle:** send `pause`, then check that frames stop changing and audio goes silent. Send `resume` and check that play continues.
6. **Performance:** frame-time p50 and p95, long tasks, heap growth over the run.
7. **Artefacts:** screenshots, a 3–5 s silent clip for the feed poster, extracted visible text, and the list of network requests (must all be same-origin or engine CDN).

Playwright drives Chromium and WebKit. Including WebKit matters because every iOS browser and WebView uses it.

## 5. Remix

- Remix forks the **source** at a specific version into a new project owned by the remixer. (v0 passed the bundle URL here, one of its bugs.) The new game records `remixOf` and the root.
- The agent starts with the parent's source, the parent's `TEMPLATE.md`, and a short summary of the parent's chat history (turn titles only; the creator's own messages stay private).
- The original creator is credited on the remix and notified. All published games can be remixed in V1. Whether creators may opt out later is an open product question.

## 6. Evals

Without evals, agent quality is guesswork. With them, every change to a prompt, template, tool or model has a score.

- **Prompt set:** about 100 creation prompts per template, written to cover typical requests, vague requests, over-ambitious requests ("like Fortnite"), IP requests ("Pokémon but…") and disallowed requests. Plus about 50 edit sequences of 3–5 turns each.
- **Automatic scores per run:** build success, all checks passing, turns and cost to the first playable build, invariant violations, and a judge model's rating of the recorded clip for clarity ("could you tell what to do within 3 seconds?"), polish and fidelity to the request.
- **Human scores:** a weekly blind sample, rated by the team on fun and fidelity. These calibrate the judge model. Where judge and humans disagree, trust the humans.
- **Gates:** a change ships only if it does not lower the pass rate or human-rated fun on the eval set beyond noise.
