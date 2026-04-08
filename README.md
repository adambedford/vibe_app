# Vibe

Instagram, but every post is a playable app you made by talking to AI.

Vibe is a mobile social platform where non-technical users create, share, and play AI-generated interactive apps — games, stories, art tools, utilities — through natural-language conversation with an AI.

## Architecture

```
vibe_app/
├── api/                    Ruby on Rails 8 API
├── apps/mobile/            React Native (Expo) mobile app
├── validator/              Playwright sidecar for app validation
├── packages/vibe-sdk/      window.vibe SDK (injected into WebViews)
├── scripts/                CI smoke tests
├── docs/                   Product and technical specifications
└── .github/workflows/      CI/CD pipelines
```

### Stack

| Layer | Technology |
|---|---|
| Mobile client | React Native / Expo Router / Zustand / TanStack Query |
| Backend API | Ruby on Rails 8 (API-only) / PostgreSQL / SolidQueue |
| App validation | Playwright (headless Chromium) |
| AI models | AWS Bedrock (Claude Haiku + Sonnet) |
| Real-time | Firebase Realtime Database |
| Asset storage | Google Cloud Storage |
| Hosting | Railway |

## Prerequisites

- Ruby 3.4+
- Node.js 22+
- PostgreSQL 16+
- Expo CLI (`npm install -g expo-cli`)

## Setup

### Rails API

```bash
cd api
cp .env.example .env
bundle install
rails db:create db:migrate db:seed
rails server
```

The API runs on `http://localhost:3000`. Seeds create 8 Vibe Originals accounts.

### Playwright Validator

```bash
cd validator
cp .env.example .env
npm install
npx playwright install chromium
npm start
```

Runs on `http://localhost:3001`.

### React Native App

```bash
cd apps/mobile
cp .env.example .env
npm install
npx expo start
```

### Vibe SDK

```bash
cd packages/vibe-sdk
npm install
npm test
```

## Running Tests

```bash
# Rails API (186 specs)
cd api && bundle exec rspec

# Playwright Validator (3 tests)
cd validator && npm test

# Vibe SDK (14 tests)
cd packages/vibe-sdk && npm test

# TypeScript check (mobile app)
cd apps/mobile && npx tsc --noEmit
```

## API Overview

All endpoints under `/api/v1/`. JWT authentication via `Authorization: Bearer <token>`.

| Area | Key Endpoints |
|---|---|
| Auth | `POST register, login, refresh` / `DELETE logout` |
| Users | `GET /:id` / `POST /:id/follow` / `DELETE /:id/follow` |
| Feed | `GET /feed` / `GET /feed/explore` / `GET /feed/following` |
| Apps | `GET /:id` / `POST /:id/like` / `POST /:id/comment` / `POST /:id/remix` |
| Create | `POST /create/sessions` / `POST /:id/approve` / `POST /:id/publish` |
| Multiplayer | `POST /lobbies` / `POST /:id/join` |

Response envelope: `{ "data": ... }` for single resources, `{ "data": [...], "pagination": { "has_more", "next_cursor" } }` for collections.

## AI Pipeline

Five-layer architecture:

1. **Router** — Rule-based classification (new generation vs. edit)
2. **Prompt Enhancer** — Silent spec enrichment (Haiku)
3. **Planner** — User-facing plan with quick-reply buttons (Haiku)
4. **Generator** — Full HTML/CSS/JS app generation (Sonnet)
5. **Validator** — Headless browser testing + error-driven retries (up to 3 passes)

Edit pipeline (fast path) handles simple tweaks in 5-15 seconds.

## Documentation

Detailed specs in `docs/`:

| Doc | Contents |
|---|---|
| 01-PRD | Product vision, features, success metrics |
| 02-Technical-Architecture | System design, DB schema, security |
| 03-AI-Pipeline | 5-layer pipeline, system prompts, cost model |
| 04-Vibe-SDK | `window.vibe` API reference |
| 05-Onboarding-UX | First launch, creation walkthrough, player UX |
| 06-Analytics | Event taxonomy, 7 funnels, dashboards |
| 07-CICD-Testing | Pipelines, testing pyramid |
| 08-Seed-Content | Launch strategy, seed apps |
| 09-Infrastructure | Railway, Firebase, GCS deployment |
| 10-Decision-Log | Every product + technical decision with rationale |
| 11-Feed-Algorithm | Scoring function, diversity rules, caching |
| 12-API-Reference | Controllers, concerns, presenters, routes |
