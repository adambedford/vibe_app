# Checks, safety and compliance

Status: first draft. Policy items marked **[verify]** await the research pass.

## 1. When checks run

| Moment | Purpose | Speed | Outcome |
|---|---|---|---|
| During creation (the agent's `playtest` tool) | Help the agent fix its own work | Seconds | Feedback to the agent |
| At the prompt | Refuse clearly disallowed requests early and cheaply, and steer borderline ones | Under 1 s | Refusal or redirect |
| At publish | Gate what reaches other people | Under 2 minutes | Pass, fail or human review |
| After publish | Catch what slipped through, and what only real players reveal | Continuous | Demote, pull or escalate |

Every new version of a published game goes through the publish checks again. Small edits must not become a way to steer a game past moderation.

## 2. Publish checks

| Check | How | Fails the publish? |
|---|---|---|
| Contract | Manifest valid; SDK and engine versions supported; capabilities declared match the calls made in the playtest | Yes |
| Bundle | Size within budget; no URLs outside the game's origin and the engine CDN | Yes |
| Boot | `ready` within budget on all device profiles; no uncaught errors in the first 10 s | Yes |
| Input response | The screen responds to the template's inputs and differs from an idle run | Yes |
| Playthrough | Bot play runs 60 s without errors or freezes; template invariants hold | Yes |
| Lifecycle | Pause stops rendering and audio; resume works | Warning at first, a hard failure once templates are stable |
| Performance | Frame time, long tasks, heap growth | Warning; lowers feed ranking |
| Content | Classifiers over screenshots, the video clip, generated assets, visible text and string literals in source | Yes for clear violations; human review for borderline cases |
| IP and clones | Names, trademarks and famous characters in text, asset prompts and visuals (word list plus a judge model) | Yes if clear; flagged otherwise |
| Quality rating | A judge model rates the clip for clarity and polish | Never blocks; sets the game's starting position in the exploration pool |

Content categories: sexual content, violence beyond cartoon level, hate, self-harm, targeting real people, drugs, simulated gambling (it affects age ratings even when nothing is paid), and phishing patterns such as a fake login form.

## 3. Distribution tiers

A game's reach grows in steps. Each step needs checks to pass and real signals to hold up:

1. **Private:** the creator and anyone with the link.
2. **Followers:** shown to the creator's followers.
3. **Exploration pool:** a small, guaranteed number of impressions to strangers, so every new game gets a fair test.
4. **Main feed:** earned through engagement in the exploration pool, with human review of a sample of games crossing this line.

Tiers bound the damage from anything the checks miss, and give the ranking system honest data about new games.

## 4. After publish

- **Runtime reports:** the SDK forwards uncaught errors and the host records crashes, freezes and quick bounces per version. A version that degrades is demoted automatically.
- **User reports** from the player overlay, with reasons, go to a review queue that shows the game, its clip, its source and its check results.
- **Controls:** pull a version, pull a game, restrict a creator, or block a creator, which hides their games for the user who blocked them. Repeat violations escalate.
- **Kill switch:** the edge worker on the games domain can refuse to serve any game or version within seconds, independently of the app.

## 5. Platform security (beyond the runtime isolation in `01-game-runtime.md`)

- **Untrusted scores.** The host checks plausibility (bounds, rate, time since `ready`). Leaderboards may mark unverified scores. Because templates use `vibe.random()` and run deterministic logic, a later step can verify a score by replaying the seed and input log headlessly. The same capability enables ghost replays (see `04-platform-services.md`).
- **Abuse of creation.** Per-user quotas on turns and cost; refuse runaway requests.
- **Prompt injection through remix.** A remixed game's source is untrusted input to the agent. The agent's tools are confined to the project, it has no secrets, and its outputs pass the same checks, so the worst case is a bad game that fails checks.
- **Generated assets** are moderated before they enter `assets/`, and again as part of the published bundle.

## 6. Age and compliance

These depend on the minimum-age decision (`00-overview.md`, open question 1). The facts below are being verified.

- **Apple App Store.** Guideline 4.7 covers HTML5 mini games inside an app and sets conditions **[verify text]**. Guideline 1.2 requires apps with UGC to filter objectionable material, offer reporting, let users block abusive users, and publish contact information **[verify text]**. Apple reportedly launched a Mini Apps Partner Program in late 2025 **[verify]**.
- **Google Play:** UGC policy and rules for apps hosting HTML5 content **[verify]**.
- **UK Online Safety Act.** If the service is likely to be accessed by children in the UK, children's risk assessments and the Protection of Children Codes apply, including age assurance where needed **[verify dates and scope]**.
- **EU Digital Services Act:** baseline duties for hosting services, such as notice and action, and statements of reasons for removals **[verify scope for small platforms]**.
- **COPPA (US):** applies if we knowingly allow under-13s or target them. Simplest to exclude under-13s with an age gate and to design the product so it doesn't appeal to young children **[verify]**.
- **Copyright and trademark.** Users will ask for clones of famous games and characters. A takedown process (in the US, a DMCA agent registration and policy) plus the IP check above.
- **Free-text features** (comments, chat, DMs) add the most moderation burden. They are kept out of V1 on purpose. The SDK has no chat.
