# Vibe — Feed Algorithm Specification

**Version:** 1.0
**Last Updated:** 2026-03-29
**Status:** Ready for Engineering

---

## 1. Feed Surfaces

Three tabs, three different strategies:

| Tab | Strategy | Purpose |
|---|---|---|
| **Home** | Algorithmic blend of social + discovery + trending | Default surface, main engagement driver |
| **Following** | Reverse chronological from followed creators | Predictable, creator-loyalty surface |
| **Explore** | Trending, no social signal, category-diverse | Discovery surface for new creators |

---

## 2. Home Feed Algorithm

### 2.1 Two-Phase Architecture

```
Phase 1: Candidate Generation
    Pull a pool of ~200 candidate apps from multiple sources

Phase 2: Scoring & Ranking
    Score each candidate, sort, apply diversity rules, return page of 20
```

This is implemented in `FeedBuilder` as a SQL query with lightweight Ruby post-processing. No ML ranking model at V1 — a weighted scoring function is the right starting point until there's enough data to justify one.

### 2.2 Candidate Sources

For a given user, pull candidates from these pools (union, deduplicated):

| Source | Pool | Recency Window | Rationale |
|---|---|---|---|
| **Following** | Apps by creators the user follows | Last 7 days | Core social content |
| **Social proof** | Apps liked or remixed by people the user follows | Last 3 days | "Your friends liked this" — trust signal |
| **Trending** | Top apps by quality score globally | Last 48 hours | Surface breakout content |
| **New creator boost** | Apps by creators with <100 total plays | Last 24 hours | Prevent winner-take-all dynamics |
| **Category backfill** | Apps from categories the user has played most | Last 7 days | Personalization without collaborative filtering |

Each source contributes a maximum number of candidates to keep the pool balanced:

```ruby
# app/services/feed_builder.rb
CANDIDATE_LIMITS = {
  following:        80,
  social_proof:     40,
  trending:         40,
  new_creator:      20,
  category_backfill: 20,
}.freeze
```

### 2.3 Scoring Function

Each candidate app receives a composite score:

```
score = quality_score × freshness_multiplier × social_multiplier
```

#### Quality Score (0.0 – 1.0)

A weighted combination of engagement signals, all normalized to 0.0–1.0 range:

```ruby
def quality_score(app)
  signals = {
    play_duration:  normalized_play_duration(app),   # Weight: 0.35
    like_ratio:     like_to_play_ratio(app),         # Weight: 0.25
    remix_rate:     remix_to_play_ratio(app),         # Weight: 0.20
    replay_rate:    replay_ratio(app),                # Weight: 0.10
    share_rate:     share_to_play_ratio(app),         # Weight: 0.10
  }

  (signals[:play_duration] * 0.35) +
  (signals[:like_ratio]    * 0.25) +
  (signals[:remix_rate]    * 0.20) +
  (signals[:replay_rate]   * 0.10) +
  (signals[:share_rate]    * 0.10)
end
```

**Signal definitions:**

| Signal | Formula | Why This Weight |
|---|---|---|
| `play_duration` | Median play session length, normalized against category median | **Heaviest weight.** This is the purest engagement signal — it measures whether people actually enjoy playing, not just whether they clicked. Normalized per-category because a 30-second clicker game and a 5-minute story have different expected durations. |
| `like_ratio` | `like_count / play_count` | Direct positive sentiment. Slightly weaker than duration because liking is a lower-cost action than continued play. |
| `remix_rate` | `remix_count / play_count` | Unique to Vibe — measures whether the app inspires creation. The flywheel signal. High-remix apps drive platform growth. |
| `replay_rate` | `(plays by returning users) / play_count` | Measures stickiness. Are people coming back? This indicates lasting value, not just novelty. |
| `share_rate` | `share_count / play_count` | Measures whether people think it's worth showing others. Organic distribution signal. |

**Normalization:** Each signal is normalized to 0.0–1.0 using percentile rank against all apps in the same category published in the last 30 days. This prevents games from competing with utility apps on play duration.

```ruby
def normalized_play_duration(app)
  category_apps = App.where(status: 'published')
                     .where('created_at > ?', 30.days.ago)
                     .where(category: app.category) # category derived from creation session
  percentile_rank(app.median_play_duration, category_apps.pluck(:median_play_duration))
end
```

#### Freshness Multiplier (0.1 – 2.0)

Time-decay function with a ~24-hour half-life. New content gets a boost; old content fades but never reaches zero.

```ruby
def freshness_multiplier(app)
  hours = (Time.current - app.created_at) / 1.hour
  [2.0 / (1.0 + (hours / 24.0)), 0.1].max
end
```

| Age | Multiplier |
|---|---|
| 0 hours | 2.0 |
| 12 hours | 1.3 |
| 24 hours | 1.0 |
| 48 hours | 0.67 |
| 72 hours | 0.5 |
| 7 days | 0.22 |

This means a mediocre app published now outranks a great app from 3 days ago. That's intentional — creators need to feel that publishing gets immediate distribution. The quality score takes over as the app ages.

#### Social Multiplier (1.0 – 1.5)

Boost for content connected to the user's social graph:

```ruby
def social_multiplier(app, user)
  if user.following_ids.include?(app.creator_id)
    1.5   # From a creator you follow
  elsif socially_endorsed?(app, user)
    1.2   # Liked or remixed by someone you follow
  else
    1.0   # No social connection
  end
end
```

### 2.4 Cold Start: New Apps

Apps with fewer than 10 plays have no reliable quality signals. They get special treatment:

1. **Boosted freshness:** `freshness_multiplier × 2.0` for the first 6 hours
2. **Sampling distribution:** Inserted into the candidate pool for a random sample of users whose followed creators or played categories overlap with the new app
3. **Quality floor:** After 10 plays, the boost drops and real signals take over
4. **Penalty escape:** If the first 10 plays show very low engagement (median play duration <5 seconds), the boost is removed early

```ruby
def cold_start_boost(app)
  return 1.0 if app.play_count >= 10
  return 1.0 if app.created_at < 6.hours.ago

  # High bounce rate kills the boost early
  return 0.5 if app.play_count >= 3 && app.median_play_duration < 5.seconds

  2.0
end
```

### 2.5 Diversity Rules (Post-Scoring)

After scoring and sorting, apply diversity rules to prevent repetitive feeds:

```ruby
def apply_diversity(ranked_apps)
  result = []
  recent_creators = []
  recent_categories = []

  ranked_apps.each do |app|
    # No more than 2 apps from same creator per page of 20
    next if recent_creators.last(20).count(app.creator_id) >= 2

    # No more than 3 consecutive apps from same category
    if recent_categories.last(3).all? { |c| c == app.category } && recent_categories.length >= 3
      next
    end

    result << app
    recent_creators << app.creator_id
    recent_categories << app.category
    break if result.size >= 20
  end

  result
end
```

### 2.6 Final Score

```ruby
def feed_score(app, user)
  quality_score(app) *
  freshness_multiplier(app) *
  social_multiplier(app, user) *
  cold_start_boost(app)
end
```

---

## 3. Following Feed

Reverse chronological. No algorithm.

```ruby
def following_feed(user, page:)
  App.where(creator_id: user.following_ids, status: 'published')
     .order(created_at: :desc)
     .page(page)
     .per(20)
end
```

This feed exists so creators have a predictable, trustworthy surface where they know their followers will see their work. Algorithmic feeds create anxiety about distribution; the Following tab eliminates that.

---

## 4. Explore Feed

Trending content with category diversity. No social signal — this is the discovery surface for users to find creators they don't follow.

```ruby
def explore_feed(page:)
  candidates = App.where(status: 'published')
                  .where('created_at > ?', 48.hours.ago)
                  .where('play_count >= ?', 5) # Minimum traction threshold

  scored = candidates.map { |app| [app, quality_score(app) * freshness_multiplier(app)] }
  ranked = scored.sort_by { |_, score| -score }

  apply_category_diversity(ranked.map(&:first), per_page: 20, page: page)
end

def apply_category_diversity(apps, per_page:, page:)
  # Ensure at least 3 different categories per page
  # Round-robin through categories, filling from top-scored within each
end
```

---

## 5. Caching Strategy

Feed computation is expensive (joins, aggregations, sorting). Cache aggressively:

| Cache | Key | TTL | Invalidation |
|---|---|---|---|
| Quality scores | `quality:{app_id}` | 15 minutes | Recalculated on TTL expiry |
| Home feed pages | `feed:{user_id}:home:{page}` | 60 seconds | TTL-based (short for freshness) |
| Following feed | `feed:{user_id}:following:{page}` | 30 seconds | Invalidated on new publish by followed creator |
| Explore feed | `feed:explore:{page}` | 5 minutes | Shared across all users |
| Candidate pools | `candidates:{user_id}` | 5 minutes | TTL-based |

Quality scores are the most expensive to compute (require aggregation queries). Caching them at 15-minute TTL means the feed updates lag by at most 15 minutes, which is fine for a non-real-time feed.

---

## 6. Database Support

### New Columns / Tables

```sql
-- Add category to apps (derived from creation session)
ALTER TABLE apps ADD COLUMN category TEXT;
CREATE INDEX idx_apps_category ON apps(category);

-- Play session tracking (for duration, replay, bounce signals)
CREATE TABLE play_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    duration_seconds INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_play_sessions_app ON play_sessions(app_id);
CREATE INDEX idx_play_sessions_user_app ON play_sessions(user_id, app_id);

-- Materialized quality scores (refreshed every 15 min by background job)
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

-- Saves / Bookmarks
CREATE TABLE saves (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    app_id          UUID REFERENCES apps(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, app_id)
);
CREATE INDEX idx_saves_user ON saves(user_id, created_at DESC);
```

### Background Job: Score Refresh

```ruby
# app/jobs/refresh_quality_scores_job.rb
class RefreshQualityScoresJob < ApplicationJob
  queue_as :default

  # Runs every 15 minutes via SolidQueue recurring schedule
  def perform
    App.where(status: 'published').where('created_at > ?', 30.days.ago).find_each do |app|
      score = QualityScoreCalculator.compute(app)
      AppQualityScore.upsert(
        { app_id: app.id, **score, calculated_at: Time.current },
        unique_by: :app_id
      )
    end
  end
end
```

---

## 7. Iteration Plan

This algorithm is a starting point. It's designed to be simple enough to reason about and tune by hand, while capturing the right signals.

**Weeks 1–4:** Ship as described. Monitor Amplitude dashboards for feed scroll depth, tap rate, and play-through rate per position.

**Weeks 4–8:** Tune weights based on data. If remix_rate is too noisy at low volumes, reduce its weight. If freshness decay is too aggressive (good content dropping off too fast), extend the half-life.

**Months 2–3:** Add collaborative filtering as a candidate source ("users who played X also played Y"). This is the first step toward personalization beyond the social graph.

**Months 3–6:** If scale justifies it, consider a lightweight ML ranking model trained on user engagement signals. But only if hand-tuned weights have clearly plateaued.
