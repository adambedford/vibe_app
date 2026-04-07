# Vibe — CI/CD & Testing Strategy

**Version:** 3.1 (Build-Ready — Rails)
**Last Updated:** 2026-03-29
**Status:** Ready for Engineering

---

## 1. CI/CD Platform

**Provider:** GitHub Actions

---

## 2. Repository Structure

```
vibe/
├── apps/
│   └── mobile/                  # React Native (Expo) client
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── api/                         # Ruby on Rails API
│   ├── app/
│   ├── config/
│   ├── db/
│   ├── spec/                    # RSpec tests
│   ├── Gemfile
│   ├── Dockerfile
│   └── .rubocop.yml
├── validator/                   # Playwright sidecar (Node.js)
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── packages/
│   ├── vibe-sdk/                # window.vibe SDK source
│   └── shared-types/            # Shared TypeScript types
├── infra/                       # Railway config, scripts
├── .github/
│   └── workflows/
│       ├── api-pr.yml
│       ├── mobile-pr.yml
│       ├── deploy-staging.yml
│       ├── deploy-production.yml
│       └── ai-pipeline-test.yml
└── scripts/
    └── ai-pipeline-test/        # Fixed prompt set for live pipeline testing
```

---

## 3. Pipeline Definitions

### 3.1 API PR Pipeline (Every Pull Request Touching `api/`)

```yaml
name: API PR Checks
on:
  pull_request:
    paths: ['api/**']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
          working-directory: api
      - run: bundle exec rubocop
        working-directory: api

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: vibe_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
          working-directory: api
      - name: Setup DB
        run: bundle exec rails db:schema:load
        working-directory: api
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/vibe_test
          RAILS_ENV: test
      - name: Run RSpec
        run: bundle exec rspec --format documentation
        working-directory: api
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/vibe_test
          RAILS_ENV: test
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: api/coverage/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
          working-directory: api
      - run: bundle exec brakeman --no-pager
        working-directory: api
      - run: bundle exec bundler-audit check --update
        working-directory: api
```

### 3.2 Mobile PR Pipeline (Every Pull Request Touching `apps/mobile/`)

```yaml
name: Mobile PR Checks
on:
  pull_request:
    paths: ['apps/mobile/**', 'packages/**']

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      - run: yarn install --frozen-lockfile
        working-directory: apps/mobile
      - run: yarn lint
        working-directory: apps/mobile
      - run: yarn typecheck
        working-directory: apps/mobile

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      - run: yarn install --frozen-lockfile
        working-directory: apps/mobile
      - run: yarn test --coverage
        working-directory: apps/mobile

  sdk-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      - run: yarn install --frozen-lockfile
        working-directory: packages/vibe-sdk
      - run: yarn test
        working-directory: packages/vibe-sdk
```

### 3.3 Deploy to Staging (Every Merge to Main)

```yaml
name: Deploy to Staging
on:
  push:
    branches: [main]

jobs:
  api-checks:
    # Full API test suite (same as PR but required to pass)

  mobile-checks:
    # Full mobile test suite

  ai-pipeline-smoke-test:
    needs: [api-checks]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
        working-directory: scripts/ai-pipeline-test
      - run: node runner.js
        working-directory: scripts/ai-pipeline-test
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}
          API_TOKEN: ${{ secrets.STAGING_SERVICE_TOKEN }}
        timeout-minutes: 30
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: ai-pipeline-results
          path: scripts/ai-pipeline-test/results.json

  deploy-api-staging:
    needs: [api-checks, ai-pipeline-smoke-test]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway (staging)
        uses: berviantoleo/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN_STAGING }}
          service: vibe-api
      - name: Run migrations
        run: railway run --service vibe-api -- bundle exec rails db:migrate
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_STAGING }}
      - name: Health check
        run: curl --fail --retry 5 --retry-delay 10 ${{ secrets.STAGING_API_URL }}/health

  mobile-preview:
    needs: [mobile-checks]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --profile preview --non-interactive
        working-directory: apps/mobile
```

### 3.4 Deploy to Production (Manual Trigger)

```yaml
name: Deploy to Production
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version (e.g., v1.2.3)'
        required: true

jobs:
  staging-validation:
    runs-on: ubuntu-latest
    steps:
      - name: Verify staging is green
        run: curl --fail ${{ secrets.STAGING_API_URL }}/health

  deploy-api-production:
    needs: staging-validation
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway (production)
        uses: berviantoleo/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN_PRODUCTION }}
          service: vibe-api
      - name: Run migrations
        run: railway run --service vibe-api -- bundle exec rails db:migrate
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PRODUCTION }}
      - name: Health check
        run: curl --fail --retry 5 --retry-delay 10 ${{ secrets.PRODUCTION_API_URL }}/health
      - name: Monitor error rate (15 min)
        run: |
          sleep 900
          # Check Sentry for error rate spike
          echo "Manual verification: check Sentry dashboard"

  mobile-release:
    needs: deploy-api-production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --profile production --non-interactive
        working-directory: apps/mobile
      # Manual step: review and submit to App Store / Play Store
```

---

## 4. Testing Strategy

### 4.1 Testing Pyramid

```
         ┌──────────┐
         │   E2E    │   Detox (mobile) — handful of critical paths
         │   Tests  │
        ┌┴──────────┴┐
        │ Integration │   RSpec request specs (API + DB), WebSocket tests
        │    Tests    │
       ┌┴─────────────┴┐
       │   Unit Tests   │   RSpec models/services, Jest components/SDK
       └────────────────┘
```

### 4.2 Rails Test Suite (RSpec)

**Coverage target:** 80% for models, services, jobs, and presenters.

```
spec/
├── models/
│   ├── user_spec.rb
│   ├── app_spec.rb
│   ├── follow_spec.rb
│   ├── like_spec.rb
│   ├── comment_spec.rb
│   ├── creation_session_spec.rb
│   └── notification_spec.rb
├── services/
│   ├── ai/
│   │   ├── model_provider_spec.rb
│   │   ├── router_spec.rb
│   │   ├── prompt_enhancer_spec.rb
│   │   ├── planner_spec.rb
│   │   ├── generator_spec.rb
│   │   ├── validator_spec.rb
│   │   ├── error_interpreter_spec.rb
│   │   └── edit_pipeline_spec.rb
│   ├── feed_builder_spec.rb
│   ├── firebase_client_spec.rb
│   └── gcs_client_spec.rb
├── jobs/
│   ├── generate_app_job_spec.rb
│   ├── generate_from_plan_job_spec.rb
│   ├── edit_app_job_spec.rb
│   └── send_notification_job_spec.rb
├── requests/                        # Integration tests (full HTTP cycle)
│   ├── auth_spec.rb
│   ├── users_spec.rb
│   ├── feed_spec.rb
│   ├── apps_spec.rb
│   ├── creation_sessions_spec.rb
│   ├── remix_spec.rb
│   └── notifications_spec.rb
├── factories/                       # FactoryBot definitions
│   ├── users.rb
│   ├── apps.rb
│   ├── creation_sessions.rb
│   └── ...
└── support/
    ├── shared_contexts.rb
    └── vcr_setup.rb                 # VCR for recording Bedrock API calls
```

**Key testing patterns:**

```ruby
# spec/services/ai/router_spec.rb
RSpec.describe AI::Router do
  context 'when session has no generated app' do
    it 'routes to full generation pipeline' do
      session = build(:creation_session, generated_version_id: nil)
      expect(described_class.route(session, 'make a snake game')).to eq(:full_generation)
    end
  end

  context 'when session has a generated app' do
    let(:session) { build(:creation_session, generated_version_id: 'ver_abc123') }

    it 'routes color changes to edit pipeline' do
      expect(described_class.route(session, 'change the color to blue')).to eq(:edit)
    end

    it 'routes new features to full generation' do
      expect(described_class.route(session, 'add a multiplayer mode')).to eq(:full_generation)
    end
  end
end
```

**External API calls** are recorded via VCR (Bedrock, Firebase, GCS) so tests don't make real network requests:

```ruby
# spec/support/vcr_setup.rb
VCR.configure do |config|
  config.cassette_library_dir = 'spec/fixtures/vcr_cassettes'
  config.hook_into :webmock
  config.filter_sensitive_data('<BEDROCK_KEY>') { ENV['AWS_SECRET_ACCESS_KEY'] }
  config.filter_sensitive_data('<FIREBASE_KEY>') { ENV['FIREBASE_SERVICE_ACCOUNT_KEY'] }
end
```

### 4.3 Mobile Test Suite (Jest + React Native Testing Library)

| Area | Framework | What's Tested |
|---|---|---|
| Vibe SDK | Jest | All public API methods, bridge protocol, mock responses |
| React components | React Native Testing Library | Render, user interaction, state changes |
| Stores | Jest | Zustand store actions, selectors |
| API hooks | Jest + MSW | TanStack Query hooks with mocked API responses |

### 4.4 E2E Tests (Detox)

**Framework:** Detox (React Native E2E)

**Critical paths:**
1. Anonymous browse → play an app → sign up
2. Create an app via walkthrough → publish
3. Open app → like → comment
4. Open app → remix → publish remix
5. Open multiplayer app → create lobby → start game

**Run frequency:** On staging deploys only (too slow for every PR).

---

## 5. AI Pipeline Live Testing

### 5.1 Purpose

Every deploy to staging runs a fixed set of prompts through the real AI pipeline. Catches model API regressions, system prompt issues, Validator test regressions, and cost anomalies.

### 5.2 Fixed Prompt Set

8–15 curated prompts covering all categories and complexity levels:

```json
[
  {
    "id": "smoke_01",
    "prompt": "make a simple clicker game",
    "expected": { "renders": true, "has_interactive_elements": true },
    "category": "game",
    "complexity": "simple"
  },
  {
    "id": "smoke_02",
    "prompt": "create a choose your own adventure story about a detective",
    "expected": { "renders": true, "has_text_content": true, "has_interactive_elements": true },
    "category": "story",
    "complexity": "medium"
  },
  {
    "id": "smoke_03",
    "prompt": "make a pixel art drawing tool",
    "expected": { "renders": true, "has_canvas_or_grid": true },
    "category": "art_tool",
    "complexity": "medium"
  },
  {
    "id": "smoke_04",
    "prompt": "build a two-player tic tac toe game",
    "expected": { "renders": true, "uses_vibe_sdk": true },
    "category": "game",
    "complexity": "medium",
    "is_multiplayer": true
  },
  {
    "id": "smoke_05",
    "prompt": "create a pomodoro timer with a clean minimal design",
    "expected": { "renders": true, "has_interactive_elements": true },
    "category": "utility",
    "complexity": "simple"
  },
  {
    "id": "smoke_06",
    "prompt": "make a space shooter with neon graphics, boss battles every 5 levels, and power-ups",
    "expected": { "renders": true, "has_canvas_or_animation": true },
    "category": "game",
    "complexity": "complex"
  },
  {
    "id": "smoke_07",
    "prompt": "create a quiz app about world geography with 15 questions",
    "expected": { "renders": true, "has_text_content": true, "has_interactive_elements": true },
    "category": "utility",
    "complexity": "medium"
  },
  {
    "id": "smoke_08",
    "prompt": "make a collaborative drawing canvas where multiple people can draw at the same time",
    "expected": { "renders": true, "uses_vibe_sdk": true, "has_canvas_or_grid": true },
    "category": "art_tool",
    "complexity": "complex",
    "is_multiplayer": true
  }
]
```

### 5.3 Pass/Fail Criteria

| Criterion | Threshold |
|---|---|
| Generation success rate | ≥ 75% of prompts (6 of 8) |
| Validator pass rate | ≥ 90% of successful generations |
| Average generation time | < 120 seconds |
| Maximum generation cost | < $2.00 per prompt |
| Zero critical failures | No prompt crashes the pipeline |

**On failure:** Staging deploy is blocked. Alert posted to Slack with failure details.

---

## 6. Security Scanning

| Tool | What | When |
|---|---|---|
| **Brakeman** | Static analysis for Rails security vulnerabilities | Every API PR |
| **bundler-audit** | Known CVEs in Ruby gem dependencies | Every API PR |
| **npm audit** | Known CVEs in Node.js dependencies | Every mobile/validator PR |
| **Dependabot** | Automated dependency update PRs | Weekly |

---

## 7. Deployment Strategy

### 7.1 Rails API (Railway)

Railway deploys on push to the linked branch. Deploy pipeline:
1. Build Docker image
2. Run migrations (`rails db:migrate`)
3. Health check (`/health` endpoint)
4. Traffic cutover (zero-downtime via Railway rolling deploy)
5. Old instance drained and terminated

**Rollback:** Railway supports instant rollback to previous deployment via dashboard or CLI.

### 7.2 Playwright Sidecar (Railway)

Separate Railway service with its own Dockerfile. Deploys independently from the Rails app. Tagged releases for version control.

### 7.3 Mobile Client (Expo EAS)

- **Major releases:** Full binary build via EAS Build, submitted to App Store / Play Store
- **Minor updates:** Expo OTA updates (JS-only, no native changes)
- **Hotfixes:** Expo OTA for critical JS fixes

### 7.4 Database Migrations

- Run automatically as part of deploy (pre-traffic-cutover step)
- All migrations must be backwards-compatible (support rolling deploy where old and new code run simultaneously)
- No column drops without a deprecation migration first
- Down migrations tested in CI
