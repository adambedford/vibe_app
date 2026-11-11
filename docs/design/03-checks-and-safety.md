# Checks, safety and compliance

Status: first draft. Compliance facts were verified on 2026-11-11 (§6).

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
| Age rating | Proposes a rating from the content results (Apple 4.7.5 requires games above the app's rating to be flagged and restricted) | No; sets who can see the game |
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

Verified against primary sources on 2026-11-11. This is a summary for design purposes and is not legal advice; a lawyer should review it before launch.

### Apple App Store (guidelines last updated 16 October 2026)

- **4.7** now explicitly covers "HTML5 and JavaScript mini apps and mini games" (wording added 13 November 2025). The app is responsible for all of them. Its conditions shape the product:
  - **4.7.1:** follow the privacy rules, provide filtering, reporting with timely responses and blocking, and use Apple in-app purchase for digital goods.
  - **4.7.2:** no exposing native APIs to games without Apple's permission. This is why haptics are out of SDK v1.
  - **4.7.3:** no sharing data or permissions with a game without explicit consent each time. This is why games get only a per-game ID.
  - **4.7.4:** an index of every game, with metadata and universal links.
  - **4.7.5:** games above the app's age rating must be flagged and restricted by verified or declared age. So **every game needs an age rating**, which the content checks can propose.
- **1.2 (user-generated content)** requires filtering, reporting with timely responses, blocking and published contact details. The October 2026 update extended it explicitly to "AI content creation apps". **1.2.1** treats casual games made by creators as UGC and requires age gating.
- The requirement to use WebKit sits in 2.5.6 (apps that browse the web). 4.7 itself no longer mentions it.
- **Mini Apps Partner Program:** 85% of qualifying in-app purchases goes to the developer, with the conditions listed in `01-game-runtime.md` §6.

Sources: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [4.7 update](https://developer.apple.com/news/?id=ey6d8onl), [Mini Apps Partner Program](https://developer.apple.com/programs/mini-apps-partner/), [October 2026 update](https://developer.apple.com/news/?id=92th7e5i).

### Google Play

- **UGC policy:** users accept terms before posting, the app moderates, and public UGC has in-app reporting and blocking ([policy](https://support.google.com/googleplay/android-developer/answer/9876937)).
- **AI-generated content** needs in-app reporting or flagging ([policy](https://support.google.com/googleplay/android-developer/answer/13985936)).
- **JavaScript running in a WebView** is exempt from the ban on downloaded code, as long as it doesn't enable policy violations ([policy](https://support.google.com/googleplay/android-developer/answer/9888379)).
- **Child Safety Standards** (self-certified by social apps) require ([policy](https://support.google.com/googleplay/android-developer/answer/14747720)):
  - published standards against child sexual abuse and exploitation
  - an in-app way to report concerns
  - acting on child sexual abuse material and reporting it to NCMEC or the relevant regional authority
  - a named point of contact

### UK Online Safety Act

- **Already in force:** illegal-content duties since 17 March 2025, and the Protection of Children Codes since 25 July 2025.
- **Children are presumed able to use the service** unless age verification or estimation means they "are not normally able to" (section 35). The test looks at actual users, not intended ones ([s.35](https://www.legislation.gov.uk/ukpga/2023/50/section/35)).
- **A personalised feed counts as a recommender system.** If the risk assessment rates harmful content as medium or high risk, Ofcom expects **highly effective age assurance** to identify children and filter their feeds. Self-declared age doesn't count. Accepted methods include facial age estimation, photo ID, open banking, credit card and mobile operator checks ([Ofcom statement](https://www.ofcom.org.uk/online-safety/protecting-children/statement-age-assurance-and-childrens-access)).
- **Implication:** any UK launch needs either an 18+ product with highly effective age assurance, or a children's risk assessment plus age-appropriate feeds. Either way, an age assurance vendor is a launch dependency for the UK.

### EU

- **Digital Services Act:** micro and small enterprises are exempt from the online-platform obligations (Articles 20–28, including Article 28 on minors), apart from Article 24(3). The baseline hosting duties still apply: contact points, terms, notice and action, and statements of reasons for removals. *This rests on secondary sources; EUR-Lex couldn't be fetched.*
- **Proposed EU KIDS Act** (COM(2026) 681, 17 September 2026). This is a proposal, not law. It would explicitly cover platforms that "allow recipients to create video games", with **no small-company exemption**. It would restrict under-13s and set a harmonised minimum age of 15 for accounts on social services with risky features ([proposal PDF](https://ec.europa.eu/newsroom/repository/document/2026-38/Proposal_for_EU_KIDS_Act__EU_Keeping_Internet_Digital_Spaces_Accountable_and_Trustworthy_wh7RxWPSibRG6UlfmCMgsZvcEgc_132530.pdf)). Track it.

### US

- **COPPA:** the amended rule has been in force since 23 June 2025, with compliance required since 22 April 2026. It applies if the service is directed to children or we know we have users under 13 ([eCFR](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)). Exclude under-13s and design so the product doesn't target them.
- **Copyright and trademark:** a DMCA designated agent, a takedown policy and a repeat-infringer policy. Rights holders move fast. Jagex had a viral AI-made RuneScape clone taken down within days in September 2026, and Bethesda sent a cease-and-desist over a vibe-coded Fallout game. A positive route helps: Remix ran a game jam with licensed IP only and rejected everything else.

### Design consequences

1. **Every game carries an age rating**, proposed by the content checks and confirmed by human review above a threshold. The host filters by the user's age band.
2. **Age assurance is a launch dependency in the UK,** and possibly in the EU later. Choose the minimum age and the launch geography together (`00-overview.md`, open questions 1 and 3).
3. **Reporting, blocking, contact details and child safety standards** are required everywhere, so they ship in Phase 1.
4. **Free-text features** (comments, chat, DMs) add the most moderation burden. They stay out of V1 on purpose. The SDK has no chat.
