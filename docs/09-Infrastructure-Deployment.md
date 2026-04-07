# Vibe — Infrastructure & Deployment Specification

**Version:** 3.0 (Build-Ready)
**Last Updated:** 2026-03-28
**Status:** Ready for Engineering

---

## 1. Corrected Technology Stack

> **Note:** This document supersedes infrastructure details in the Technical Architecture doc.
> During planning, the team settled on the following stack which differs from some
> earlier drafts. This is the canonical, final technology map.

| Layer | Technology | Rationale |
|---|---|---|
| **Mobile client** | React Native / Expo | Simultaneous iOS/Android, fast iteration |
| **State management** | Zustand | Lightweight, TypeScript-native |
| **Data fetching** | TanStack Query | Caching, optimistic updates, pagination |
| **WebView sandbox** | react-native-webview | App player sandbox |
| **Backend API** | Ruby on Rails | Rapid development, convention-over-config, excellent for 2–3 person team |
| **Database** | PostgreSQL (Railway managed) | Relational data, JSONB for flexible schemas |
| **Background jobs** | SolidQueue | Rails-native job system, no Redis dependency for basic queuing |
| **Real-time** | Firebase (Firestore + Realtime Database) | Streaming AI responses + multiplayer state sync |
| **Asset storage** | Google Cloud Storage (GCS) | App bundles, thumbnails, avatars |
| **App validation** | Playwright sidecar service (Railway) | Headless browser testing of generated apps |
| **Analytics** | Amplitude | Funnel analysis, retention, cohorts |
| **AI vendor** | AWS Bedrock | Model hosting, inference, future distillation/fine-tuning |
| **AI models** | Haiku-class (fast layers), Sonnet/frontier (Generator) | Per-layer model sizing |
| **Push notifications** | Expo Notifications (FCM + APNs) | Cross-platform push |
| **Dev tooling** | Cursor, Claude Code | AI-assisted development |
| **CI/CD** | GitHub Actions | Pipeline automation |
| **Hosting** | Railway | Backend services, Playwright sidecar |

---

## 2. Why Railway (Not AWS ECS/EKS)

For a 2–3 person bootstrapped team, Railway provides:

- **Zero DevOps overhead** — no Terraform, no VPCs, no load balancer configuration
- **Git-push deploys** — push to main, Railway builds and deploys
- **Managed PostgreSQL** — backups, scaling, connection pooling built in
- **Sidecar services** — Playwright validator runs as a separate Railway service
- **Predictable pricing** — usage-based, no surprise AWS bills
- **Good enough for V1** — can migrate to AWS later if scale demands it

**Migration path:** If Vibe outgrows Railway, the Rails app is containerized (Dockerfile) and can deploy to any container platform (ECS, Fly.io, Render, etc.) with minimal changes.

---

## 3. Service Architecture on Railway

```
Railway Project: vibe-production
├── vibe-api              # Rails API server (web process)
├── vibe-worker           # SolidQueue background worker (same Rails app, worker process)
├── vibe-validator        # Playwright sidecar (Node.js service)
├── postgresql            # Managed PostgreSQL
└── redis (optional)      # Only if needed for caching beyond SolidQueue
```

### 3.1 vibe-api (Rails Web Process)

- Handles all REST API requests
- Authentication (JWT via `jwt` gem + `has_secure_password`)
- Serves feed, profiles, social graph, app metadata
- Orchestrates AI pipeline (enqueues generation jobs)
- Receives webhooks from Firebase for real-time event logging

**Scaling:** Railway auto-scaling based on request volume. Start with 1 instance, scale to 2–4 as needed.

### 3.2 vibe-worker (SolidQueue Worker)

Same Rails codebase, different process (runs SolidQueue processor):

- AI pipeline orchestration (calls Bedrock, manages retries)
- App validation (calls Playwright sidecar)
- Screenshot generation for thumbnails
- Notification delivery
- Content moderation (initial automated scan)
- Analytics event batching (server-side Amplitude events)

**Job Types:**

| Job | Queue | Priority | Timeout |
|---|---|---|---|
| `GenerateAppJob` | `generation` | Normal | 180s |
| `ValidateAppJob` | `validation` | High | 30s |
| `EditAppJob` | `generation` | High | 60s |
| `GenerateThumbnailJob` | `default` | Low | 30s |
| `SendNotificationJob` | `notifications` | Normal | 10s |
| `ModerationScanJob` | `moderation` | Normal | 30s |

### 3.3 vibe-validator (Playwright Sidecar)

Separate Node.js service on Railway that:
- Receives app HTML bundles via internal HTTP API
- Launches Playwright (headless Chromium) to test the app
- Runs the Validator test suite (see AI Pipeline doc, Section 6)
- Returns test results + optional screenshot
- Generates app thumbnail screenshots for the feed

**API:**

```
POST /validate
  Body: { html: string, tests?: string[] }
  Response: { passed: boolean, results: TestResult[], screenshot?: string }

POST /screenshot
  Body: { html: string, viewport?: { width, height } }
  Response: { screenshot: string }  // base64 PNG
```

**Why a separate service:** Playwright requires Chromium, which is heavy (~400MB). Running it in the same process as Rails would bloat the main service. A sidecar keeps the concerns separated and allows independent scaling.

---

## 4. Firebase Architecture

Firebase handles two distinct real-time concerns:

### 4.1 AI Generation Streaming

During app generation, the AI pipeline streams progress updates to the client:

```
Firebase Realtime Database path:
/generation/{session_id}/
  status: "enhancing" | "planning" | "generating" | "validating" | "retrying" | "complete" | "failed"
  progress: 0-100
  stage_label: "Building the core..."
  result_url: "https://storage.googleapis.com/vibe-bundles/..."  // Set on completion
  error: { message: "...", retryable: boolean }  // Set on failure
```

**Client listens** to `/generation/{session_id}/` and updates the progress UI in real-time.

**Worker writes** to this path as it moves through pipeline stages.

### 4.2 Multiplayer State Sync

Multiplayer games use Firebase Realtime Database for low-latency state synchronization:

```
Firebase Realtime Database path:
/multiplayer/{session_id}/
  lobby/
    host: "usr_abc"
    players/
      usr_abc: { name: "Alex", avatar: "...", joined_at: timestamp }
      usr_def: { name: "Sam", avatar: "...", joined_at: timestamp }
    status: "waiting" | "starting" | "active"
    max_players: 4
  state/
    {key}: {value}   // Arbitrary game state, synced across all players
  turns/
    current_player: "usr_abc"
    turn_number: 3
    timer_end: timestamp
  scores/
    usr_abc: { score: 1500, metadata: {} }
    usr_def: { score: 1200, metadata: {} }
```

**Why Firebase Realtime Database (not Firestore):**
- Lower latency for real-time state sync (~10ms vs ~30ms)
- Better suited for rapidly changing game state
- Simpler pricing model for frequent small writes
- Firestore's query capabilities aren't needed for game state (simple key-value)

### 4.3 Firebase Security Rules

```json
{
  "rules": {
    "generation": {
      "$session_id": {
        ".read": "auth != null && root.child('session_owners').child($session_id).val() === auth.uid",
        ".write": false  // Only server writes via Admin SDK
      }
    },
    "multiplayer": {
      "$session_id": {
        "lobby": {
          ".read": "auth != null",
          ".write": false  // Server manages lobby state
        },
        "state": {
          ".read": "auth != null && root.child('multiplayer').child($session_id).child('lobby').child('players').child(auth.uid).exists()",
          ".write": "auth != null && root.child('multiplayer').child($session_id).child('lobby').child('players').child(auth.uid).exists()"
        },
        "turns": {
          ".read": "auth != null",
          ".write": false  // Server manages turns
        },
        "scores": {
          ".read": true,
          ".write": false  // Server validates and writes scores
        }
      }
    }
  }
}
```

---

## 5. Google Cloud Storage

### 5.1 Buckets

| Bucket | Content | Access |
|---|---|---|
| `vibe-app-bundles` | Generated HTML/CSS/JS app files | Public read (CDN-cached) |
| `vibe-thumbnails` | Auto-generated app preview screenshots | Public read (CDN-cached) |
| `vibe-avatars` | User profile images | Public read (CDN-cached) |

### 5.2 CDN

GCS buckets are served via **Cloud CDN** (or Firebase Hosting CDN) with:

- Edge caching globally
- App bundles are immutable, keyed by `{app_id}/{iso_timestamp}.html` (e.g., `abc123/2026-03-29T14:32:07Z.html`)
- Cache-Control: `public, max-age=31536000, immutable` for bundles
- Cache-Control: `public, max-age=86400` for thumbnails and avatars

### 5.3 Upload Flow

1. Rails backend generates a **signed upload URL** (short-lived, single-use)
2. Worker uploads the generated app bundle directly to GCS
3. Version record created in `app_versions` table, `apps.current_version_id` updated
4. Client fetches bundle URL from API, loads into WebView

---

## 6. AWS Bedrock (AI Only)

Bedrock is used exclusively for AI model inference. No other AWS services are used in V1.

### 6.1 Configuration

```ruby
# config/initializers/bedrock.rb
require 'aws-sdk-bedrockruntime'

BEDROCK_CLIENT = Aws::BedrockRuntime::Client.new(
  region: 'us-east-1',
  credentials: Aws::Credentials.new(
    ENV['AWS_ACCESS_KEY_ID'],
    ENV['AWS_SECRET_ACCESS_KEY']
  )
)
```

### 6.2 Model Provider Abstraction

```ruby
# app/services/ai/model_provider.rb
class AI::ModelProvider
  def self.complete(model_id:, prompt:, system:, max_tokens:)
    # Calls Bedrock InvokeModel API
    # Returns parsed response text
  end
end

# Per-layer configuration
AI_CONFIG = {
  prompt_enhancer: { model_id: 'anthropic.claude-3-haiku-...', max_tokens: 2000 },
  planner:         { model_id: 'anthropic.claude-3-haiku-...', max_tokens: 3000 },
  generator:       { model_id: 'anthropic.claude-3-5-sonnet-...', max_tokens: 16000 },
  error_interpreter: { model_id: 'anthropic.claude-3-haiku-...', max_tokens: 1500 },
  edit_model:      { model_id: 'anthropic.claude-3-haiku-...', max_tokens: 16000 },
}.freeze
```

This abstraction enables per-layer model swapping without pipeline changes. When Bedrock adds new models or when distilled models are ready, only the config changes.

---

## 7. Environment Configuration

### 7.1 Railway Environments

| Environment | Railway Project | Database | Firebase | Bedrock |
|---|---|---|---|---|
| `development` | `vibe-dev` | Local Docker PG | Firebase emulator | Bedrock (cheapest models) |
| `staging` | `vibe-staging` | Railway managed PG | Firebase staging project | Bedrock (production models) |
| `production` | `vibe-production` | Railway managed PG | Firebase production project | Bedrock (production models) |

### 7.2 Environment Variables

```bash
# Rails
RAILS_ENV=production
SECRET_KEY_BASE=...
DATABASE_URL=postgresql://...  # Provided by Railway

# Firebase
FIREBASE_PROJECT_ID=vibe-production
FIREBASE_SERVICE_ACCOUNT_KEY=...  # JSON key, base64-encoded

# Google Cloud Storage
GCS_BUCKET_BUNDLES=vibe-app-bundles
GCS_BUCKET_THUMBNAILS=vibe-thumbnails
GCS_BUCKET_AVATARS=vibe-avatars
GCS_SERVICE_ACCOUNT_KEY=...

# AWS Bedrock
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Amplitude
AMPLITUDE_API_KEY=...

# Validator sidecar
VALIDATOR_SERVICE_URL=http://vibe-validator.railway.internal:3001

# Push notifications
EXPO_ACCESS_TOKEN=...
```

---

## 8. Monitoring

### 8.1 Railway Built-In

- Request logs and metrics per service
- CPU / memory / network dashboards
- Deploy logs and rollback capability

### 8.2 Application-Level

| Concern | Tool |
|---|---|
| Error tracking | Sentry (Rails + React Native) |
| Performance monitoring | Sentry Performance (APM) |
| Uptime monitoring | BetterUptime or UptimeRobot |
| Log aggregation | Railway logs + optional Datadog/Papertrail |
| AI pipeline metrics | Custom Amplitude events (server-side) |

### 8.3 Alerting

| Alert | Channel |
|---|---|
| Error rate spike (>5%) | Slack #alerts |
| AI generation failure rate >20% | Slack #alerts |
| Railway service restart | Slack #alerts |
| Database connection issues | Slack #alerts + PagerDuty (if configured) |
