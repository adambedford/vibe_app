# Vibe — Deployment Runbook

Complete instructions for provisioning all infrastructure and deploying Vibe to staging and production. This document is designed to be handed to an operator (human or AI agent) who has access to the required accounts.

---

## Prerequisites

Before starting, you need accounts on:
- **Railway** (railway.app) — backend hosting
- **Google Cloud Platform** — Firebase + GCS
- **AWS** — Bedrock AI models
- **Expo** (expo.dev) — mobile app builds
- **Sentry** (sentry.io) — error tracking
- **Amplitude** (amplitude.com) — analytics
- **GitHub** — repo hosting + CI/CD
- **Slack** — alerting (optional)
- **Apple Developer Program** — iOS App Store (for production)
- **Google Play Console** — Android Play Store (for production)

---

## Phase 1: GitHub Repository

### 1.1 Push the codebase

```bash
cd /Users/adam/Projects/vibe_app
git remote set-url origin git@github.com:<org>/vibe.git  # or create new repo
git push origin main
```

### 1.2 Configure GitHub Secrets

Go to **Settings > Secrets and variables > Actions** and add these repository secrets:

| Secret | Where to get it |
|---|---|
| `RAILWAY_TOKEN_STAGING` | Railway dashboard > Account Settings > Tokens |
| `RAILWAY_TOKEN_PRODUCTION` | Railway dashboard > Account Settings > Tokens |
| `STAGING_API_URL` | Will be set after Railway deploy (e.g., `https://vibe-api-staging.up.railway.app`) |
| `PRODUCTION_API_URL` | Will be set after Railway deploy (e.g., `https://api.vibe.app`) |
| `EXPO_TOKEN` | expo.dev > Account Settings > Access Tokens > Create |
| `STAGING_SERVICE_TOKEN` | A JWT for the smoke test runner (generate after first deploy) |

---

## Phase 2: Railway — Backend Services

### 2.1 Create the Railway project

1. Go to railway.app and create a new project named `vibe-staging`
2. Add a **PostgreSQL** database service (Railway managed)
3. Note the `DATABASE_URL` from the PostgreSQL service's variables

### 2.2 Deploy vibe-api (Rails web process)

1. Create a new service in the project, connect it to the GitHub repo
2. Set **Root Directory** to `api`
3. Set **Start Command** to `bundle exec rails server -p $PORT -b 0.0.0.0`
4. Add these environment variables:

```
RAILS_ENV=production
SECRET_KEY_BASE=<generate with: ruby -e "require 'securerandom'; puts SecureRandom.hex(64)">
DATABASE_URL=<from PostgreSQL service>
RAILS_MASTER_KEY=<from api/config/master.key>

# Firebase
FIREBASE_PROJECT_ID=vibe-staging
FIREBASE_SERVICE_ACCOUNT_KEY=<base64-encoded JSON key, from Phase 3>

# Google Cloud Storage
GCS_PROJECT_ID=<from Phase 3>
GCS_CREDENTIALS_JSON=<service account JSON, from Phase 3>
GCS_BUCKET_BUNDLES=vibe-app-bundles-staging
GCS_BUCKET_THUMBNAILS=vibe-thumbnails-staging
GCS_BUCKET_AVATARS=vibe-avatars-staging

# AWS Bedrock
AWS_ACCESS_KEY_ID=<from Phase 4>
AWS_SECRET_ACCESS_KEY=<from Phase 4>
AWS_REGION=us-east-1

# Validator sidecar (internal Railway networking)
VALIDATOR_SERVICE_URL=http://vibe-validator.railway.internal:3001

# Sentry
SENTRY_DSN=<from Phase 6>

# Amplitude
AMPLITUDE_API_KEY=<from Phase 7>

# Expo push notifications
EXPO_ACCESS_TOKEN=<from Phase 8>

# Slack alerting (optional)
SLACK_WEBHOOK_URL=<from Phase 9>
```

5. Deploy. After deploy completes, run migrations:
```
railway run --service vibe-api -- bundle exec rails db:migrate
railway run --service vibe-api -- bundle exec rails db:seed
```

6. Verify: `curl https://<railway-url>/up` should return 200

### 2.3 Deploy vibe-worker (SolidQueue background worker)

1. Create another service in the same project, connect to same GitHub repo
2. Set **Root Directory** to `api`
3. Set **Start Command** to `bundle exec rails solid_queue:start`
4. Copy all the same environment variables from vibe-api
5. Deploy

The worker shares the same codebase and database as the API but runs the SolidQueue processor instead of Puma.

### 2.4 Deploy vibe-validator (Playwright sidecar)

1. Create another service, connect to GitHub repo
2. Set **Root Directory** to `validator`
3. Set **Start Command** to `node src/server.js`
4. Add environment variable: `PORT=3001`
5. Deploy
6. Verify: the internal URL `http://vibe-validator.railway.internal:3001/health` should return `{"status":"ok"}`

### 2.5 Custom domain (production only)

1. In Railway, add custom domain `api.vibe.app` to the vibe-api service
2. Configure DNS: CNAME record pointing to Railway's provided domain
3. Update `PRODUCTION_API_URL` in GitHub Secrets

---

## Phase 3: Google Cloud Platform — Firebase + GCS

### 3.1 Create GCP Project

1. Go to console.cloud.google.com
2. Create a new project named `vibe-staging` (and later `vibe-production`)
3. Enable the following APIs:
   - Cloud Storage API
   - Firebase Realtime Database API
   - Cloud Resource Manager API

### 3.2 Create GCS Buckets

Create 3 buckets in the project:

```
Bucket: vibe-app-bundles-staging
  Location: us-central1 (or closest to Railway region)
  Storage class: Standard
  Access control: Fine-grained
  Public access: Allow public

Bucket: vibe-thumbnails-staging
  Location: us-central1
  Storage class: Standard
  Access control: Fine-grained
  Public access: Allow public

Bucket: vibe-avatars-staging
  Location: us-central1
  Storage class: Standard
  Access control: Fine-grained
  Public access: Allow public
```

For each bucket, set CORS to allow requests from any origin:
```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Set Cache-Control headers:
- `vibe-app-bundles-staging`: `public, max-age=31536000, immutable`
- `vibe-thumbnails-staging`: `public, max-age=86400`
- `vibe-avatars-staging`: `public, max-age=86400`

### 3.3 Create GCS Service Account

1. Go to IAM & Admin > Service Accounts
2. Create a service account named `vibe-gcs-writer`
3. Grant role: **Storage Object Admin** on all 3 buckets
4. Create a JSON key and download it
5. This JSON key goes into the `GCS_CREDENTIALS_JSON` env var on Railway

### 3.4 Set Up Firebase

1. Go to console.firebase.google.com
2. Add Firebase to the GCP project
3. Enable **Realtime Database** (not Firestore)
4. Set database location to `us-central1`
5. Deploy security rules:

```json
{
  "rules": {
    "generation": {
      "$session_id": {
        ".read": "auth != null && root.child('session_owners').child($session_id).val() === auth.uid",
        ".write": false
      }
    },
    "session_owners": {
      "$session_id": {
        ".read": false,
        ".write": false
      }
    },
    "multiplayer": {
      "$session_id": {
        "lobby": {
          ".read": "auth != null",
          ".write": false
        },
        "state": {
          ".read": "auth != null && root.child('multiplayer').child($session_id).child('lobby').child('players').child(auth.uid).exists()",
          ".write": "auth != null && root.child('multiplayer').child($session_id).child('lobby').child('players').child(auth.uid).exists()"
        },
        "turns": {
          ".read": "auth != null",
          ".write": false
        },
        "scores": {
          ".read": true,
          ".write": false
        }
      }
    }
  }
}
```

### 3.5 Create Firebase Service Account

1. In Firebase console > Project Settings > Service Accounts
2. Generate a new private key (JSON)
3. Base64-encode it: `base64 -i firebase-key.json`
4. This goes into `FIREBASE_SERVICE_ACCOUNT_KEY` env var on Railway

### 3.6 Firebase Authentication (for mobile client)

1. In Firebase console > Authentication > Sign-in method
2. Enable **Email/Password**
3. Enable **Apple** (requires Apple Developer account configuration)
4. Enable **Google** (requires OAuth consent screen in GCP)
5. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
6. Place these in `apps/mobile/` for EAS builds

---

## Phase 4: AWS — Bedrock AI Models

### 4.1 Create IAM User

1. Go to AWS Console > IAM > Users
2. Create a user named `vibe-bedrock`
3. Attach policy: **AmazonBedrockFullAccess**
4. If using Rekognition for content moderation, also attach: **AmazonRekognitionReadOnlyAccess**
5. Create access keys (Access Key ID + Secret Access Key)
6. These go into `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` on Railway

### 4.2 Request Model Access

1. Go to AWS Console > Amazon Bedrock > Model Access
2. Region: `us-east-1`
3. Request access to:
   - **Anthropic Claude 3 Haiku** (used for Prompt Enhancer, Planner, Error Interpreter, Edit Pipeline)
   - **Anthropic Claude 3.5 Sonnet** (used for Generator)
4. Access is usually granted within minutes

### 4.3 Verify

```bash
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --content-type application/json \
  --accept application/json \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  --region us-east-1 \
  output.json
```

Should return a valid response.

---

## Phase 5: Expo — Mobile App Builds

### 5.1 Create Expo Account and Project

1. Create account at expo.dev
2. Install EAS CLI: `npm install -g eas-cli`
3. Login: `eas login`
4. Navigate to `apps/mobile/`
5. Create project: `eas init` (or link to existing)

### 5.2 Configure app.json

Update `apps/mobile/app.json`:
- Set `expo.slug` to `vibe`
- Set `expo.owner` to your Expo organization
- Set `expo.ios.bundleIdentifier` to `app.vibe.mobile`
- Set `expo.android.package` to `app.vibe.mobile`

### 5.3 Build Preview (staging)

```bash
cd apps/mobile
eas build --platform all --profile preview
```

This produces installable builds for internal testing. Share the install link with testers.

### 5.4 Build Production

```bash
eas build --platform all --profile production
```

### 5.5 Submit to App Stores (production only)

**iOS:**
1. Fill in `eas.json` submit config: `appleId`, `ascAppId`, `appleTeamId`
2. Create App Store Connect listing with screenshots, description, etc.
3. `eas submit --platform ios`

**Android:**
1. Create Google Play Console listing
2. Upload service account key for automated uploads
3. `eas submit --platform android`

### 5.6 Create Expo Access Token

1. Go to expo.dev > Account Settings > Access Tokens
2. Create a token named `github-actions`
3. Add as `EXPO_TOKEN` in GitHub Secrets

---

## Phase 6: Sentry — Error Tracking

### 6.1 Create Sentry Project

1. Go to sentry.io and create an organization
2. Create two projects:
   - `vibe-api` (platform: Ruby on Rails)
   - `vibe-mobile` (platform: React Native)
3. Note the DSN for each project

### 6.2 Configure Rails

The Rails app is already configured. Just set the `SENTRY_DSN` env var on Railway with the `vibe-api` project DSN.

### 6.3 Configure React Native

Install the Sentry Expo SDK in the mobile app:
```bash
cd apps/mobile
npx expo install @sentry/react-native
```

Add to `app/_layout.tsx`:
```typescript
import * as Sentry from '@sentry/react-native';
Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
```

Add `EXPO_PUBLIC_SENTRY_DSN` to the EAS build env vars.

### 6.4 Set Up Alerts

In Sentry:
1. Create alert rule: "Error rate > 5% over 5 minutes" -> Slack notification
2. Create alert rule: "New issue in production" -> Slack notification

---

## Phase 7: Amplitude — Analytics

### 7.1 Create Amplitude Project

1. Go to amplitude.com and create an organization
2. Create a project named `Vibe`
3. Note the API key from Settings > Projects > Vibe

### 7.2 Configure

- Set `AMPLITUDE_API_KEY` on Railway (server-side tracking)
- Set `EXPO_PUBLIC_AMPLITUDE_API_KEY` in EAS build env (client-side tracking)

### 7.3 Create Dashboards

Create the 4 dashboards from doc `06-Analytics-Instrumentation.md`:

1. **Daily Operations**: DAU/WAU/MAU, signups, apps created/published, plays, AI success rate
2. **Creator Health**: Apps per creator, publish rate, remix rate, creator retention
3. **Content Quality**: Avg play duration, replay rate, like-to-play ratio, reports
4. **AI Pipeline**: Generations/hour, success rate, fix pass distribution, cost trend

### 7.4 Create Funnels

Create the 7 launch funnels:
1. Anonymous -> Signed Up (target: 30% conversion at signup wall)
2. Signed Up -> First App Created (target: 60%)
3. App Created -> App Published (target: 70%)
4. App Published -> Played by Others (target: 10+ plays in 24h)
5. App Played -> Remix (target: 15% remix tap, 50% completion)
6. Multiplayer App -> Session (target: 20%)
7. D1 -> D7 -> D30 Retention (targets: 60%, 40%, 25%)

---

## Phase 8: Expo Push Notifications

### 8.1 Configure FCM (Android)

1. In Firebase console > Project Settings > Cloud Messaging
2. Enable Cloud Messaging API (V1)
3. Generate a server key
4. Upload to Expo: `eas credentials` or Expo dashboard > Push Notifications

### 8.2 Configure APNs (iOS)

1. In Apple Developer portal > Certificates, Identifiers & Profiles
2. Create an APNs key (or certificate)
3. Upload to Expo: `eas credentials` or Expo dashboard

### 8.3 Create Expo Access Token

Already done in Phase 5.6. Set `EXPO_ACCESS_TOKEN` on Railway so the server can send push notifications via the Expo API.

---

## Phase 9: Slack Alerting (Optional)

### 9.1 Create Slack App

1. Go to api.slack.com/apps
2. Create a new app named `Vibe Alerts`
3. Enable **Incoming Webhooks**
4. Create a webhook for channel `#alerts`
5. Copy the webhook URL

### 9.2 Configure

Set `SLACK_WEBHOOK_URL` on Railway. The `SlackAlerter` service will send alerts for:
- Error rate spikes (>5%)
- AI pipeline failure rate (>20%)
- Deploy events

---

## Phase 10: Uptime Monitoring

### 10.1 Set Up BetterUptime (or UptimeRobot)

Create monitors for:
- `https://<staging-url>/up` — check every 1 minute
- `https://api.vibe.app/up` — check every 1 minute (production)

Alert via Slack and email when down.

---

## Phase 11: Generate Seed Content

After all services are deployed and verified:

```bash
railway run --service vibe-api -- bundle exec rails db:seed        # Create Vibe Originals accounts
railway run --service vibe-api -- bundle exec rake seed:apps       # Generate 22 seed apps via AI pipeline
```

This requires:
- Bedrock credentials configured (Haiku + Sonnet access)
- Validator sidecar running
- GCS buckets accessible
- Firebase configured

The seed task runs each prompt through the full AI pipeline synchronously. Expect ~45-120 seconds per app. Total time: ~30-45 minutes for all 22 apps.

Monitor progress via Railway logs: `railway logs --service vibe-api`

---

## Phase 12: Production Deploy

After staging is verified:

1. Create a new Railway project named `vibe-production`
2. Repeat Phase 2 with production environment variables
3. Create production GCS buckets (without `-staging` suffix)
4. Create production Firebase project
5. Use same AWS Bedrock credentials (or create separate IAM user)
6. Point custom domain `api.vibe.app` to the production Railway service
7. Run the production deploy workflow:

```
GitHub Actions > Deploy to Production > Run workflow > version: v1.0.0
```

This will:
1. Verify staging is healthy
2. Deploy API + validator to Railway production
3. Run migrations
4. Build Expo production binary
5. Create a GitHub release

---

## Verification Checklist

After completing all phases, verify each component:

| Check | Command / Action | Expected |
|---|---|---|
| API health | `curl https://api.vibe.app/up` | 200 |
| Database | `railway run -- rails console` then `User.count` | 8 (seed accounts) |
| Firebase | Check Realtime DB in Firebase console | Rules deployed |
| GCS | Upload test file to any bucket | Accessible via public URL |
| Bedrock | Create a test creation session via API | App generated |
| Validator | Check Railway logs for validator service | Healthy |
| Sentry | Trigger a test error | Appears in Sentry dashboard |
| Amplitude | Register a test user | Event appears in Amplitude |
| Push notifications | Like a seed user's app | Notification received |
| Slack alerts | Temporarily break an endpoint | Alert fires in #alerts |
| Seed apps | `App.published.count` in Rails console | 20+ |
| Mobile app | Install preview build, open feed | Seed apps visible |
| CI/CD | Push a test commit | Workflows run green |

---

## Rollback Procedures

### API Rollback
Railway supports instant rollback to previous deployment:
```
railway rollback --service vibe-api
```
Or use the Railway dashboard > Deployments > select previous > Rollback.

### Database Rollback
```
railway run --service vibe-api -- bundle exec rails db:rollback STEP=1
```

### Mobile App Rollback
For JS-only changes: push an OTA update reverting the change.
For native changes: submit a new build to app stores.

---

## Cost Estimates (Monthly)

| Service | Staging | Production |
|---|---|---|
| Railway (API + Worker + Validator + PG) | ~$20 | ~$50-200 |
| GCS (storage + CDN) | ~$1 | ~$5-50 |
| Firebase (Realtime DB) | Free tier | ~$25-100 |
| AWS Bedrock (AI inference) | ~$50 | ~$500-5000 |
| Expo (EAS builds) | Free tier | ~$0-99 |
| Sentry | Free tier | Free tier |
| Amplitude | Free tier | Free tier |
| **Total** | **~$70** | **~$600-5400** |

Bedrock cost scales directly with usage. At 1000 generations/day with Sonnet: ~$150-400/day. See `03-AI-Pipeline-Specification.md` Section 8 for detailed cost breakdown.
