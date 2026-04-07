# Vibe — Technical Architecture Specification

**Version:** 3.1 (Build-Ready — Rails)
**Last Updated:** 2026-03-29
**Status:** Ready for Engineering

---

## 1. System Overview

Vibe is a three-tier mobile application:

1. **Client Tier** — React Native mobile app (iOS + Android)
2. **Service Tier** — Ruby on Rails API, AI pipeline workers, Playwright validation sidecar
3. **Data Tier** — PostgreSQL, Google Cloud Storage, Firebase Realtime Database, Redis (optional)

```
┌─────────────────────────────────────┐
│         React Native Client         │
│  ┌──────────┐  ┌──────────────────┐ │
│  │  Social   │  │  Creation Studio │ │
│  │  Layer    │  │  (Chat UI)       │ │
│  └────┬─────┘  └───────┬──────────┘ │
│       │                │            │
│  ┌────┴────────────────┴──────────┐ │
│  │    App Player (WebView)        │ │
│  │    + window.vibe SDK injection │ │
│  └────────────┬───────────────────┘ │
└───────────────┼─────────────────────┘
                │
        ┌───────┴───────┐
        │  Rails API    │
        │  (Railway)    │
        └──┬────────┬───┘
           │        │
    ┌──────┘        └──────────┐
    │                          │
┌───┴──────────┐   ┌──────────┴──────┐
│  SolidQueue  │   │    Firebase     │
│  Workers     │   │  Realtime DB    │
│  (AI, jobs)  │   │  (sync, stream) │
└───┬──────────┘   └─────────────────┘
    │
┌───┴──────────┐
│  Playwright  │
│  Sidecar     │
│  (Railway)   │
└──────────────┘
        │
┌───────┴─────────────────────────────┐
│            Data Layer               │
│  PostgreSQL · GCS · Firebase · Redis│
└─────────────────────────────────────┘
```

---

## 2. Client Architecture

### 2.1 Framework & Stack

| Component | Technology | Rationale |
|---|---|---|
| Framework | React Native (Expo managed) | Simultaneous iOS/Android, fast iteration |
| Navigation | Expo Router | File-based routing, deep link support |
| State Management | Zustand | Lightweight, TypeScript-native |
| Networking | TanStack Query (React Query) | Caching, optimistic updates, pagination |
| WebView | react-native-webview | App player sandbox |
| Real-time | Firebase JS SDK | Multiplayer sync, generation streaming |
| Push Notifications | Expo Notifications (FCM + APNs) | Cross-platform push |
| Media | Expo Image | Optimized image loading for feed |

### 2.2 App Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (tabs)/
│   │   ├── feed.tsx        # Main feed
│   │   ├── explore.tsx     # Discover / trending
│   │   ├── create.tsx      # Creation Studio entry
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── app/[id].tsx        # App player (full-screen WebView)
│   ├── profile/[id].tsx    # Other user profiles
│   ├── remix/[id].tsx      # Remix flow (Creation Studio + source)
│   └── auth/               # Login / signup
├── components/
│   ├── feed/               # FeedCard, FeedList, AppPreview
│   ├── creation/           # ChatBubble, PlanCard, QuickReply, ProgressIndicator
│   ├── player/             # AppWebView, PlayerControls, MultiplayerLobby
│   ├── social/             # FollowButton, CommentThread, LikeButton
│   └── common/             # Avatar, Button, Modal, etc.
├── services/
│   ├── api.ts              # REST API client (TanStack Query hooks)
│   ├── firebase.ts         # Firebase Realtime DB client
│   ├── auth.ts             # Authentication service
│   └── storage.ts          # Secure local storage
├── stores/
│   ├── authStore.ts        # Auth state (Zustand)
│   ├── feedStore.ts        # Feed state and pagination
│   ├── creationStore.ts    # Creation session state
│   └── playerStore.ts      # Active app player state
├── sdk/
│   └── vibe-sdk.js         # The window.vibe SDK (injected into WebViews)
└── utils/
    ├── deeplink.ts         # Deep link handling for shared apps
    └── analytics.ts        # Amplitude event tracking
```

### 2.3 WebView Sandbox Configuration

The App Player WebView runs generated apps in a secure sandbox. Phaser, Tone.js, and the Vibe SDK are pre-loaded into the WebView before the app HTML loads — no CDN round-trip at runtime.

```typescript
// Pre-load game engine, audio, and SDK into WebView before app HTML
const PRELOADED_LIBS = [
  require('./lib/phaser.min.js'),   // ~1MB, bundled with RN binary
  require('./lib/tone.min.js'),     // ~150KB, bundled with RN binary
  vibeSDKSource,                    // Vibe multiplayer SDK
].join('\n');

<WebView
  source={{ html: stripCDNTags(appBundle.html) }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  mediaPlaybackRequiresUserAction={false}
  allowsInlineMediaPlayback={true}
  // SECURITY: Sandbox restrictions
  originWhitelist={['about:blank']}
  allowsLinkPreview={false}
  allowFileAccess={false}
  allowFileAccessFromFileURLs={false}
  allowUniversalAccessFromFileURLs={false}
  allowsBackForwardNavigationGestures={false}  // Prevent swipe-back breaking game controls
  // Library + SDK injection (runs before app HTML)
  injectedJavaScriptBeforeContentLoaded={PRELOADED_LIBS}
  onMessage={handleSDKMessage}
/>
```

**CDN tag stripping:** The Generator still outputs `<script src="cdn.jsdelivr.net/...">` tags (needed for Validator testing in Playwright). The client strips them before loading into the WebView since the libraries are already injected:

```typescript
function stripCDNTags(html: string): string {
  return html.replace(/<script[^>]*cdn\.jsdelivr\.net[^>]*><\/script>/g, '');
}
```

**Why pre-load instead of CDN:**
- **Instant game load** — Phaser (~1MB) is already in memory, no network fetch
- **Offline-resilient** — games load even without connectivity (bundle from GCS cache + local libs)
- **Tighter sandbox** — CSP no longer needs any external script-src whitelist
- **Version-locked** — Phaser version is tied to the app binary, not CDN "latest"
- **Cost:** ~1.2MB added to RN binary (negligible)

**Content Security Policy** (injected into app HTML):

```
default-src 'self' 'unsafe-inline' 'unsafe-eval';
connect-src wss://*.vibe.app https://api.vibe.app;
img-src 'self' data: blob:;
media-src 'self' data: blob:;
font-src 'self' data:;
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
```

No external domains whitelisted. The only network access allowed is to Vibe's own multiplayer/API endpoints.

**Pre-Loaded Libraries (bundled with React Native binary):**

| Library | Size | Version Strategy |
|---|---|---|
| Phaser 3 | ~1MB | Pinned version, updated with app releases |
| Tone.js | ~150KB | Pinned version, updated with app releases |
| Vibe SDK | ~15KB | Updated with app releases |

Adding new libraries requires: bundling in the RN binary, updating the injection array, updating the Generator system prompt, and a new app release.

---

## 3. Backend Architecture (Ruby on Rails)

### 3.1 Rails Application Structure

A single Rails API-only application handles all backend concerns. Logical domains are organized as namespaced controllers and service objects, not separate microservices.

```
vibe-api/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       └── v1/
│   │           ├── base_controller.rb               # Default CRUD, convention-based
│   │           ├── concerns/
│   │           │   ├── renderable.rb                # Presenter-based rendering
│   │           │   ├── error_handling.rb             # Rescue handlers, error envelope
│   │           │   ├── paginatable.rb               # Cursor-based pagination
│   │           │   ├── sortable.rb                  # Query param sorting
│   │           │   ├── filterable.rb                # Query param filtering
│   │           │   └── authorizable.rb              # Permissions, ownership checks
│   │           ├── auth_controller.rb
│   │           ├── me_controller.rb                 # Current user, avatar, deletion
│   │           ├── users_controller.rb
│   │           ├── feed_controller.rb
│   │           ├── apps_controller.rb
│   │           ├── creation_sessions_controller.rb
│   │           ├── multiplayer_controller.rb
│   │           └── notifications_controller.rb
│   ├── presenters/
│   │   ├── application_presenter.rb
│   │   ├── user_presenter.rb
│   │   ├── app_presenter.rb
│   │   ├── app_version_presenter.rb
│   │   ├── comment_presenter.rb
│   │   ├── notification_presenter.rb
│   │   └── creation_session_presenter.rb
│   ├── models/
│   │   ├── user.rb
│   │   ├── follow.rb
│   │   ├── app.rb
│   │   ├── app_version.rb
│   │   ├── like.rb
│   │   ├── comment.rb
│   │   ├── save.rb
│   │   ├── play_session.rb
│   │   ├── app_quality_score.rb
│   │   ├── creation_session.rb
│   │   ├── multiplayer_session.rb
│   │   ├── multiplayer_player.rb
│   │   ├── scoreboard_entry.rb
│   │   ├── notification.rb
│   │   ├── report.rb
│   │   └── jwt_denylist.rb
│   ├── services/
│   │   ├── ai/
│   │   │   ├── model_provider.rb
│   │   │   ├── router.rb
│   │   │   ├── prompt_enhancer.rb
│   │   │   ├── planner.rb
│   │   │   ├── generator.rb
│   │   │   ├── validator.rb
│   │   │   ├── error_interpreter.rb
│   │   │   └── edit_pipeline.rb
│   │   ├── feed_builder.rb
│   │   ├── quality_score_calculator.rb
│   │   ├── content_moderation_service.rb
│   │   ├── firebase_client.rb
│   │   ├── gcs_client.rb
│   │   └── notification_sender.rb
│   ├── jobs/
│   │   ├── generate_app_job.rb
│   │   ├── generate_from_plan_job.rb
│   │   ├── validate_and_retry_job.rb
│   │   ├── edit_app_job.rb
│   │   ├── generate_thumbnail_job.rb
│   │   ├── refresh_quality_scores_job.rb
│   │   ├── send_notification_job.rb
│   │   ├── moderation_scan_job.rb
│   │   ├── account_deletion_job.rb
│   │   └── cleanup_drafts_job.rb
│   └── validators/
│       ├── prompt_validator.rb
│       └── app_bundle_validator.rb
├── config/
│   ├── routes.rb
│   ├── storage.yml
│   ├── initializers/
│   │   ├── bedrock.rb
│   │   ├── firebase.rb
│   │   ├── gcs.rb
│   │   ├── rack_attack.rb
│   │   └── kaminari.rb
│   └── solid_queue.yml
├── db/
│   ├── migrate/
│   └── seeds.rb
└── spec/
    ├── presenters/
    ├── models/
    ├── controllers/
    │   └── api/
    │       └── v1/
    ├── services/
    ├── jobs/
    └── requests/
```

> Full Rails framework architecture (BaseController, concerns, presenters, resource controllers) documented in `12-API-Reference.md`.

### 3.2 Process Model on Railway

```
Railway Project: vibe-production
├── vibe-api        →  web: bundle exec rails server -p $PORT
├── vibe-worker     →  worker: bundle exec rails solid_queue:start
├── vibe-validator  →  Separate Node.js service (Playwright)
└── postgresql      →  Railway managed add-on
```

The **web** and **worker** processes share the same Rails codebase and Docker image. Railway runs them as separate services with different start commands.

### 3.3 SolidQueue Configuration

```yaml
# config/solid_queue.yml
production:
  dispatchers:
    - polling_interval: 1
      batch_size: 500
  workers:
    - queues: [generation, validation]
      threads: 3
      processes: 2
      polling_interval: 0.5
    - queues: [notifications, default]
      threads: 5
      processes: 1
      polling_interval: 1
    - queues: [moderation]
      threads: 2
      processes: 1
      polling_interval: 2
```

| Queue | Jobs | Concurrency | Timeout |
|---|---|---|---|
| `generation` | GenerateAppJob, EditAppJob | 3 threads × 2 processes | 180s / 60s |
| `validation` | ValidateAndRetryJob, GenerateThumbnailJob | 3 threads × 2 processes | 30s |
| `notifications` | SendNotificationJob | 5 threads × 1 process | 10s |
| `moderation` | ModerationScanJob | 2 threads × 1 process | 30s |
| `default` | Everything else | 5 threads × 1 process | 30s |

### 3.4 API Routes

All routes namespaced under `/api/v1/`. Full routes definition and resource controller implementations in `12-API-Reference.md` §2 and §6.

**Summary of endpoints:**

| Area | Endpoints | Auth Required |
|---|---|---|
| Auth | `POST register, login, refresh` · `DELETE logout` | No (except logout) |
| Me | `GET/PATCH/DELETE /me` | Yes |
| Users | `GET /:id` · `GET /:id/apps, followers, following` · `POST/DELETE /:id/follow` | Partial (show/apps public) |
| Feed | `GET /feed, /feed/explore, /feed/following` | Yes (explore allows anonymous in V1.1) |
| Apps | `GET /:id, /:id/bundle, /:id/lineage, /:id/versions, /:id/comments` | Partial (show/bundle/comments public) |
| App actions | `POST/DELETE /:id/like, /:id/save` · `POST /:id/comment, /:id/report, /:id/play, /:id/remix` · `POST /:id/revert/:version_id` | Yes |
| Creation | `POST /create/sessions` · `GET /:id` · `POST /:id/message, /:id/approve, /:id/publish` | Yes |
| Multiplayer | `POST /lobbies` · `GET /:id` · `POST /:id/join` | Yes |
| Notifications | `GET /notifications` · `PATCH /:id/read` · `POST /read_all` | Yes |

### 3.5 Authentication

- **Approach:** `has_secure_password` (bcrypt) + `jwt` gem for token management
- **OAuth:** `omniauth-apple`, `omniauth-google-oauth2`
- **Token format:** JWT (access: 15 min, refresh: 30 days)
- **Revocation:** JwtDenylist table (JTI-based)
- **Age gate:** Date-of-birth at registration, 16+ enforced
- **Auth concern:** `Authorizable` on BaseController handles token decode and `current_user` resolution
- **Full auth controller:** See `12-API-Reference.md` §6.7

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_secure_password
  has_one_attached :avatar

  has_many :apps, foreign_key: :creator_id, dependent: :destroy
  has_many :creation_sessions, dependent: :destroy
  has_many :active_follows, class_name: 'Follow', foreign_key: :follower_id, dependent: :destroy
  has_many :passive_follows, class_name: 'Follow', foreign_key: :following_id, dependent: :destroy
  has_many :following, through: :active_follows, source: :following
  has_many :followers, through: :passive_follows, source: :follower
  has_many :likes, dependent: :destroy
  has_many :saves, dependent: :destroy
  has_many :notifications, dependent: :destroy

  validates :email, presence: true, uniqueness: true
  validates :username, presence: true, uniqueness: true
  validates :display_name, presence: true
  validates :date_of_birth, presence: true
  validates :status, inclusion: { in: %w[active pending_deletion deleted] }
  validate :minimum_age

  scope :active, -> { where(status: 'active') }

  def avatar_url
    avatar.attached? ? avatar.url : nil
  end

  private

  def minimum_age
    errors.add(:date_of_birth, 'must be at least 16') if date_of_birth.present? && date_of_birth > 16.years.ago.to_date
  end
end
```

### 3.6 Key Gems

```ruby
# Gemfile (key dependencies)
gem 'rails', '~> 8.0'
gem 'pg'                          # PostgreSQL
gem 'solid_queue'                 # Background jobs
gem 'jwt'                         # JWT token encode/decode
gem 'bcrypt'                      # Password hashing (has_secure_password)
gem 'omniauth-apple'              # Apple Sign-In
gem 'omniauth-google-oauth2'      # Google Sign-In
gem 'rack-attack'                 # Rate limiting
gem 'rack-cors'                   # CORS handling
gem 'kaminari'                    # Pagination support
gem 'aws-sdk-bedrockruntime'      # AWS Bedrock for AI
gem 'google-cloud-storage'        # GCS uploads
gem 'firebase-admin-sdk'          # Firebase Admin
gem 'httparty'                    # HTTP client (Playwright sidecar)
gem 'image_processing'            # Active Storage image variants (V1.1)
gem 'sentry-ruby'                 # Error tracking
gem 'sentry-rails'

group :development, :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'faker'
  gem 'rubocop-rails', require: false
end

group :test do
  gem 'shoulda-matchers'
  gem 'webmock'
  gem 'vcr'                       # Record/replay external API calls
end
```

---

## 4. Data Architecture

### 4.1 Database: PostgreSQL (Railway Managed)

```sql
-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_digest TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    username        TEXT UNIQUE NOT NULL,
    avatar_url      TEXT,
    bio             TEXT,
    date_of_birth   DATE NOT NULL,
    status          TEXT DEFAULT 'active',        -- active, pending_deletion, deleted
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JWT Denylist (token revocation)
CREATE TABLE jwt_denylists (
    id              BIGSERIAL PRIMARY KEY,
    jti             TEXT NOT NULL,
    exp             TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_jwt_denylist_jti ON jwt_denylists(jti);

-- Social Graph
CREATE TABLE follows (
    follower_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Apps (Published Artifacts)
CREATE TABLE apps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    current_version_id UUID,               -- FK added after app_versions table exists
    parent_id       UUID REFERENCES apps(id),
    root_id         UUID REFERENCES apps(id),
    is_multiplayer  BOOLEAN DEFAULT false,
    max_players     SMALLINT DEFAULT 1,
    category        TEXT,                   -- game, story, art_tool, utility, social
    play_count      BIGINT DEFAULT 0,
    like_count      BIGINT DEFAULT 0,
    remix_count     BIGINT DEFAULT 0,
    comment_count   BIGINT DEFAULT 0,
    status          TEXT DEFAULT 'draft',             -- draft, published, under_review, removed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_apps_creator ON apps(creator_id);
CREATE INDEX idx_apps_parent ON apps(parent_id);
CREATE INDEX idx_apps_root ON apps(root_id);
CREATE INDEX idx_apps_created ON apps(created_at DESC);
CREATE INDEX idx_apps_status ON apps(status) WHERE status = 'published';

-- App Versions (immutable snapshots, timestamp-ordered)
CREATE TABLE app_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    bundle_url      TEXT NOT NULL,           -- GCS: {app_id}/{created_at_iso}.html
    thumbnail_url   TEXT,
    source          TEXT NOT NULL,            -- 'generation', 'edit', 'revert'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_versions_app ON app_versions(app_id, created_at DESC);

-- Deferred FK: apps.current_version_id -> app_versions.id
ALTER TABLE apps ADD CONSTRAINT fk_apps_current_version
    FOREIGN KEY (current_version_id) REFERENCES app_versions(id);

-- Likes
CREATE TABLE likes (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, app_id)
);
CREATE INDEX idx_likes_app ON likes(app_id);

-- Comments
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES comments(id),
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_app ON comments(app_id, created_at);

-- Creation Sessions
CREATE TABLE creation_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,  -- Draft app auto-created with session
    source_app_id   UUID REFERENCES apps(id),                     -- Set if this is a remix
    status          TEXT DEFAULT 'active',
    messages        JSONB DEFAULT '[]',
    enhanced_prompt TEXT,
    plan            JSONB,
    plan_approved   BOOLEAN DEFAULT false,
    generated_version_id UUID REFERENCES app_versions(id),
    generation_cost NUMERIC(6,4),
    error_log       JSONB,
    fix_passes      SMALLINT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON creation_sessions(user_id);
CREATE INDEX idx_sessions_status ON creation_sessions(status) WHERE status = 'generating';

-- Multiplayer Sessions
CREATE TABLE multiplayer_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    host_user_id    UUID REFERENCES users(id),
    status          TEXT DEFAULT 'lobby',
    max_players     SMALLINT DEFAULT 8,
    firebase_path   TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ
);

CREATE TABLE multiplayer_players (
    session_id      UUID REFERENCES multiplayer_sessions(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ DEFAULT now(),
    is_host         BOOLEAN DEFAULT false,
    PRIMARY KEY (session_id, user_id)
);

-- Scoreboards
CREATE TABLE scoreboard_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    score           BIGINT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scoreboards_app_score ON scoreboard_entries(app_id, score DESC);

-- Notifications
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    actor_id        UUID REFERENCES users(id),
    app_id          UUID REFERENCES apps(id),
    read            BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;

-- Reports
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID REFERENCES users(id),
    app_id          UUID REFERENCES apps(id),
    reason          TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saves / Bookmarks (users can save apps to play again later)
CREATE TABLE saves (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, app_id)
);
CREATE INDEX idx_saves_user ON saves(user_id, created_at DESC);

-- Play Sessions (tracks individual play events for feed algorithm signals)
CREATE TABLE play_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    duration_seconds INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_play_sessions_app ON play_sessions(app_id);
CREATE INDEX idx_play_sessions_user_app ON play_sessions(user_id, app_id);

-- Materialized Quality Scores (refreshed every 15 min by background job)
CREATE TABLE app_quality_scores (
    app_id              UUID PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
    play_duration_norm  REAL DEFAULT 0,
    like_ratio_norm     REAL DEFAULT 0,
    remix_rate_norm     REAL DEFAULT 0,
    replay_rate_norm    REAL DEFAULT 0,
    share_rate_norm     REAL DEFAULT 0,
    composite_score     REAL DEFAULT 0,
    play_count          BIGINT DEFAULT 0,
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quality_scores_composite ON app_quality_scores(composite_score DESC);
```

### 4.2 Counter Caches

Denormalized counts on the `apps` table, updated via Rails `counter_cache` or `increment!`:

```ruby
class Like < ApplicationRecord
  belongs_to :user
  belongs_to :app, counter_cache: :like_count
end
```

For `play_count`, increment on controller action with deduplication:

```ruby
def show
  @app = App.published.find(params[:id])
  @app.increment!(:play_count) unless recent_play?(@app)
  render_resource(@app)
end
```

### 4.3 Firebase Realtime Database

Full Firebase architecture in `09-Infrastructure-Deployment.md` Section 4.

### 4.4 Google Cloud Storage

Full GCS configuration in `09-Infrastructure-Deployment.md` Section 5.

---

## 5. AI Pipeline Integration

### 5.1 Model Provider Abstraction

```ruby
# app/services/ai/model_provider.rb
class AI::ModelProvider
  BEDROCK_CLIENT = Aws::BedrockRuntime::Client.new(
    region: ENV['AWS_REGION'],
    credentials: Aws::Credentials.new(ENV['AWS_ACCESS_KEY_ID'], ENV['AWS_SECRET_ACCESS_KEY'])
  )

  MODELS = {
    prompt_enhancer:   ENV.fetch('MODEL_PROMPT_ENHANCER',   'anthropic.claude-3-haiku-20240307-v1:0'),
    planner:           ENV.fetch('MODEL_PLANNER',           'anthropic.claude-3-haiku-20240307-v1:0'),
    generator:         ENV.fetch('MODEL_GENERATOR',         'anthropic.claude-3-5-sonnet-20241022-v2:0'),
    error_interpreter: ENV.fetch('MODEL_ERROR_INTERPRETER', 'anthropic.claude-3-haiku-20240307-v1:0'),
    edit_model:        ENV.fetch('MODEL_EDIT',              'anthropic.claude-3-haiku-20240307-v1:0'),
  }.freeze

  def self.complete(layer:, system:, prompt:, max_tokens: 4096)
    model_id = MODELS.fetch(layer)
    response = BEDROCK_CLIENT.invoke_model(
      model_id: model_id,
      content_type: 'application/json',
      accept: 'application/json',
      body: {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: max_tokens,
        system: system,
        messages: [{ role: 'user', content: prompt }]
      }.to_json
    )
    JSON.parse(response.body.string).dig('content', 0, 'text')
  end
end
```

### 5.2 Generation Job Flow

```ruby
# app/jobs/generate_app_job.rb
class GenerateAppJob < ApplicationJob
  queue_as :generation

  def perform(session_id)
    session = CreationSession.find(session_id)
    firebase = FirebaseClient.new

    # Layer 2: Prompt Enhancer
    firebase.update_status(session_id, status: 'enhancing', progress: 10)
    enhanced = AI::PromptEnhancer.call(session.messages, session.source_app)
    session.update!(enhanced_prompt: enhanced.spec, status: 'planning')

    # Layer 3: Planner
    firebase.update_status(session_id, status: 'planning', progress: 20)
    plan = AI::Planner.call(enhanced.spec, session.messages)
    session.update!(plan: plan.to_json)
    firebase.update_status(session_id, status: 'awaiting_approval', progress: 25, plan: plan)
    # Pauses here — user approves via API, which enqueues GenerateFromPlanJob
  end
end

# app/jobs/generate_from_plan_job.rb
class GenerateFromPlanJob < ApplicationJob
  queue_as :generation

  def perform(session_id)
    session = CreationSession.find(session_id)
    firebase = FirebaseClient.new

    # Layer 4: Generator
    firebase.update_status(session_id, status: 'generating', progress: 40)
    bundle_html = AI::Generator.call(
      plan: session.plan,
      enhanced_spec: session.enhanced_prompt,
      original_prompt: session.user_prompt,
      source_app_bundle: session.source_app&.bundle_html
    )

    # Layer 5: Validator
    validate_and_finalize(session, bundle_html, firebase)
  end

  private

  def validate_and_finalize(session, html, firebase, pass: 0)
    firebase.update_status(session.id, status: 'validating', progress: 80 + (pass * 5))
    result = AI::Validator.call(html)

    if result.passed?
      timestamp = Time.current.iso8601
      url = GcsClient.upload_bundle(session.app_id, html, timestamp: timestamp)
      screenshot_b64 = AI::Validator.screenshot(html)
      thumb_url = GcsClient.upload_thumbnail(session.app_id, screenshot_b64, timestamp: timestamp)

      # Create immutable version record
      version = AppVersion.create!(
        app_id: session.app_id,
        bundle_url: url,
        thumbnail_url: thumb_url,
        source: session.source_app_id? ? 'generation' : 'edit'
      )

      # Post-render content scan (text + screenshot safety)
      content_check = ContentModerationService.scan(
        text: result.extracted_text,
        screenshot: screenshot_b64
      )

      if content_check.safe?
        session.app.update!(current_version_id: version.id)  # App stays draft until user publishes
        session.update!(generated_version_id: version.id, status: 'completed',
                        generation_cost: calculate_cost(session))
        firebase.update_status(session.id, status: 'complete', progress: 100,
                               result_url: url)
      else
        session.update!(generated_version_id: version.id, status: 'under_review',
                        generation_cost: calculate_cost(session))
        firebase.update_status(session.id, status: 'under_review', progress: 100)
        # Version exists but app.current_version_id not updated until review passes
      end
    elsif pass < 3
      firebase.update_status(session.id, status: 'retrying', progress: 85 + (pass * 3))
      fix_instructions = AI::ErrorInterpreter.call(result.failures)
      session.increment!(:fix_passes)
      session.update!(error_log: (session.error_log || []) + [result.failures])

      retried_html = AI::Generator.call(
        plan: session.plan, enhanced_spec: session.enhanced_prompt,
        original_prompt: session.user_prompt, source_app_bundle: html,
        fix_instructions: fix_instructions
      )
      validate_and_finalize(session, retried_html, firebase, pass: pass + 1)
    else
      session.update!(status: 'failed')
      firebase.update_status(session.id, status: 'failed',
                             error: 'Generation failed after 3 fix attempts')
    end
  end
end
```

### 5.3 Playwright Sidecar Communication

```ruby
# app/services/ai/validator.rb
class AI::Validator
  SIDECAR_URL = ENV.fetch('VALIDATOR_SERVICE_URL', 'http://vibe-validator.railway.internal:3001')

  def self.call(html)
    response = HTTParty.post(
      "#{SIDECAR_URL}/validate",
      body: { html: html }.to_json,
      headers: { 'Content-Type' => 'application/json' },
      timeout: 30
    )
    ValidationResult.new(JSON.parse(response.body))
  end
end
```

---

## 6. Security

### 6.1 App Sandbox Security Model

1. **No network access** except Vibe SDK endpoints (multiplayer, scoreboard). No external CDN — Phaser/Tone.js are pre-loaded.
2. **No device API access** (camera, GPS, contacts)
3. **No navigation** to external URLs
4. **No persistent local storage** beyond current session
5. **CSP enforced** at HTML level (see Section 2.3)
6. **Message bridge** — all communication via postMessage (Vibe SDK)

### 6.2 Generated Code Scanning

Before publishing:
1. **Static analysis** — scan for malicious patterns
2. **Headless browser execution** — Playwright sidecar monitors for suspicious behavior
3. **Content scan** — check rendered output for prohibited content

### 6.3 API Security

```ruby
# config/initializers/rack_attack.rb
Rack::Attack.throttle('api/ip', limit: 300, period: 5.minutes) { |req| req.ip }

Rack::Attack.throttle('api/user', limit: 60, period: 1.minute) do |req|
  req.env.dig('warden', 'user', 'id') || req.env['jwt.user_id']
end

Rack::Attack.throttle('creation/user', limit: 10, period: 1.hour) do |req|
  req.env.dig('warden', 'user', 'id') if req.path.start_with?('/create/sessions') && req.post?
end
```

- HTTPS enforced (TLS 1.3, Railway)
- JWT authentication (jwt gem + Authorizable concern)
- Strong Parameters for input validation
- ActiveRecord parameterized queries (SQL injection prevention)
- CORS via `rack-cors` gem

---

## 7. Monitoring & Observability

### 7.1 Error Tracking: Sentry

```ruby
# config/initializers/sentry.rb
Sentry.init do |config|
  config.dsn = ENV['SENTRY_DSN']
  config.traces_sample_rate = 0.1
  config.profiles_sample_rate = 0.1
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]
end
```

### 7.2 Key Dashboards

| Dashboard | Metrics | Source |
|---|---|---|
| **Platform Health** | Request rate, error rate, P50/P95/P99 latency | Sentry APM |
| **AI Pipeline** | Success rate, avg time, cost, fix pass distribution | Amplitude (server-side) |
| **Feed Engagement** | DAU, plays/user, scroll depth | Amplitude |
| **Creation Funnel** | Start → plan → approve → generate → publish | Amplitude |
| **Multiplayer** | Sessions, players/session, duration | Amplitude |
| **Moderation** | Reports/day, queue depth, resolution rate | Internal dashboard |

### 7.3 Alerting

| Alert | Trigger | Channel |
|---|---|---|
| Error rate > 5% | 5-min window | Slack |
| AI failure > 20% | 15-min window | Slack |
| Railway restart | Railway webhook | Slack |
| DB connection pool > 80% | Health check | Slack |
| SolidQueue unhandled exception | Sentry | Slack |
