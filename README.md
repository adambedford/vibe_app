# Vibe (working name)

A social app whose feed is made of small games. Each game plays as soon as it scrolls into view. Anyone can make one by describing it to an AI agent, usually starting from a template, and anyone can remix any game. Underneath sits a shared platform: identity, saves, leaderboards, challenges, analytics, and later multiplayer.

There is no code yet. This is the design stage.

## Read in this order

1. [`docs/design/00-overview.md`](docs/design/00-overview.md): what has to be true, principles, system map, phases, open questions
2. [`docs/design/01-game-runtime.md`](docs/design/01-game-runtime.md): the game contract, isolation, the host–game protocol, the SDK, the feed runtime
3. [`docs/design/02-creation.md`](docs/design/02-creation.md): templates, the creation agent, the playtest harness, evals, remix
4. [`docs/design/03-checks-and-safety.md`](docs/design/03-checks-and-safety.md): quality and safety checks, distribution tiers, compliance
5. [`docs/design/04-platform-services.md`](docs/design/04-platform-services.md): identity, saves, social play, multiplayer, analytics, ranking, data model, stack
6. [`docs/decisions.md`](docs/decisions.md): the decision log
7. [`docs/legacy-v0-review.md`](docs/legacy-v0-review.md): what we kept from the earlier attempt (commit `3371204`) and why the rest was dropped
