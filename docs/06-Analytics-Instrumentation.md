# Vibe — Analytics & Instrumentation Specification

**Version:** 3.0 (Build-Ready)
**Last Updated:** 2026-03-28
**Status:** Ready for Engineering

---

## 1. Analytics Platform

**Provider:** Amplitude

**Rationale:** Best-in-class funnel analysis, cohort tracking, and retention curves. Native React Native SDK. Free tier sufficient for pre-launch; Growth plan scales with user base.

---

## 2. Event Taxonomy

### 2.1 Naming Convention

```
[Object]_[Action]

Examples:
  app_played
  app_created
  app_published
  feed_scrolled
  lobby_created
  remix_started
```

### 2.2 Global Properties (Every Event)

| Property | Type | Description |
|---|---|---|
| `user_id` | string | Authenticated user ID (null if anonymous) |
| `session_id` | string | App session ID |
| `platform` | string | `ios` or `android` |
| `app_version` | string | Client app version |
| `is_anonymous` | boolean | Whether user is pre-signup |
| `timestamp` | ISO 8601 | Event time |

### 2.3 Core Events

**Authentication & Onboarding**

| Event | Properties | Trigger |
|---|---|---|
| `app_opened` | `{ source: 'organic' \| 'deeplink' \| 'notification' }` | App launched |
| `signup_wall_shown` | `{ trigger: 'create' \| 'like' \| 'comment' \| 'follow' \| 'remix' }` | Sign-up prompt displayed |
| `signup_completed` | `{ method: 'email' \| 'apple' \| 'google' }` | Account created |
| `signup_dismissed` | `{ trigger }` | User dismissed sign-up wall |
| `profile_setup_completed` | `{}` | Display name / avatar set |
| `walkthrough_started` | `{}` | First creation walkthrough begins |
| `walkthrough_step_completed` | `{ step: 1\|2\|3\|4, selection: string }` | Each walkthrough step |
| `walkthrough_skipped` | `{ at_step: number }` | User tapped "Just let me type" |
| `walkthrough_completed` | `{ selections: object }` | Walkthrough finished, entering creation |

**Feed & Discovery**

| Event | Properties | Trigger |
|---|---|---|
| `feed_viewed` | `{ tab: 'home' \| 'explore' \| 'following' }` | Feed tab opened |
| `feed_card_impressed` | `{ app_id, position, tab }` | Card ≥50% visible in viewport for ≥1 second |
| `feed_scrolled` | `{ max_depth: number, cards_impressed: number, duration_seconds: number, tab }` | User *leaves* the feed tab (single summary event, not per-scroll-frame) |
| `feed_card_tapped` | `{ app_id, position, source: 'feed' \| 'explore' \| 'profile' \| 'saved' }` | User taps an app card |
| `explore_search` | `{ query }` | Search in explore tab |

**App Playing**

| Event | Properties | Trigger |
|---|---|---|
| `app_played` | `{ app_id, creator_id, is_multiplayer, source, version_id }` | App opens in player |
| `app_play_duration` | `{ app_id, duration_seconds, completed: boolean, bounced: boolean }` | User exits player OR app calls `endSession()` |
| `app_liked` | `{ app_id }` | Like tapped |
| `app_unliked` | `{ app_id }` | Like removed |
| `app_commented` | `{ app_id, comment_length }` | Comment submitted |
| `app_shared` | `{ app_id, method: 'link' \| 'native_share' }` | Share triggered |
| `app_saved` | `{ app_id }` | Save/bookmark tapped |
| `app_unsaved` | `{ app_id }` | Save removed |
| `app_reported` | `{ app_id, reason }` | Report submitted |

**App Creation**

| Event | Properties | Trigger |
|---|---|---|
| `creation_started` | `{ source: 'walkthrough' \| 'create_tab' \| 'remix', source_app_id? }` | Creation session begins |
| `creation_prompt_sent` | `{ session_id, prompt_length, is_first }` | User sends a message |
| `creation_plan_shown` | `{ session_id, complexity, is_multiplayer }` | Planner presents plan |
| `creation_plan_approved` | `{ session_id, modifications_made: boolean }` | User approves plan |
| `creation_plan_modified` | `{ session_id, modification_type }` | User modifies plan |
| `creation_generation_started` | `{ session_id }` | Generator begins |
| `creation_generation_completed` | `{ session_id, duration_seconds, fix_passes, cost_usd }` | Generator succeeds |
| `creation_generation_failed` | `{ session_id, error_type, fix_passes }` | Generator failed after max retries |
| `creation_edit_sent` | `{ session_id, edit_type: 'fast' \| 'full' }` | Edit message sent post-generation |
| `creation_app_tested` | `{ session_id }` | User plays the generated app in-studio |
| `creation_published` | `{ session_id, app_id, total_edits, total_duration }` | App published to feed |
| `creation_abandoned` | `{ session_id, stage, messages_sent }` | Session abandoned |

**Remix**

| Event | Properties | Trigger |
|---|---|---|
| `remix_started` | `{ source_app_id, source_creator_id }` | Remix button tapped |
| `remix_published` | `{ app_id, source_app_id, modifications_description }` | Remix published |

**Multiplayer**

| Event | Properties | Trigger |
|---|---|---|
| `lobby_created` | `{ app_id, max_players }` | Lobby created |
| `lobby_joined` | `{ app_id, lobby_id, player_count }` | Player joins lobby |
| `lobby_invite_sent` | `{ app_id, method: 'link' \| 'notification' }` | Invite sent |
| `multiplayer_session_started` | `{ app_id, player_count }` | Game starts |
| `multiplayer_session_ended` | `{ app_id, duration_seconds, player_count }` | Game ends |
| `score_submitted` | `{ app_id, score }` | Score posted to leaderboard |

**Social**

| Event | Properties | Trigger |
|---|---|---|
| `user_followed` | `{ followed_user_id }` | Follow action |
| `user_unfollowed` | `{ unfollowed_user_id }` | Unfollow action |
| `profile_viewed` | `{ viewed_user_id, source }` | Profile page opened |
| `notification_tapped` | `{ type, age_seconds }` | Notification opened |

---

## 3. Seven Launch Funnels

These funnels are instrumented from day one and monitored daily.

### Funnel 1: Anonymous → Signed Up

```
app_opened (anonymous)
  → feed_viewed
    → app_played (1st)
      → app_played (2nd)
        → signup_wall_shown
          → signup_completed
```

**Target conversion:** 30% of users who see signup wall complete signup

### Funnel 2: Signed Up → First App Created

```
signup_completed
  → walkthrough_started
    → walkthrough_completed
      → creation_plan_shown
        → creation_plan_approved
          → creation_generation_completed
```

**Target conversion:** 60% of new signups complete their first generation

### Funnel 3: App Created → App Published

```
creation_generation_completed
  → creation_app_tested
    → creation_published
```

**Target conversion:** 70% of successful generations are published

### Funnel 4: App Published → App Played by Others

```
creation_published
  → [appears in feed]
    → feed_card_tapped (by other user)
      → app_played (by other user)
```

**Target:** Average 10+ plays within 24 hours of publishing

### Funnel 5: App Played → Remix

```
app_played
  → [user taps remix]
    → remix_started
      → creation_plan_approved
        → creation_generation_completed
          → remix_published
```

**Target conversion:** 15% of plays lead to a remix tap; 50% of remix starts complete

### Funnel 6: Multiplayer App → Multiplayer Session

```
app_played (is_multiplayer=true)
  → lobby_created
    → lobby_invite_sent
      → lobby_joined (2+ players)
        → multiplayer_session_started
```

**Target:** 20% of multiplayer app plays result in a multiplayer session

### Funnel 7: D1 → D7 → D30 Retention

```
signup_completed (D0)
  → app_opened (D1)
    → app_opened (D7)
      → app_opened (D30)
```

**Targets:** D1: 60%, D7: 40%, D30: 25%

---

## 4. Key Dashboards

### 4.1 Daily Operations Dashboard

- DAU / WAU / MAU
- New signups
- Apps created / published
- Total plays
- Feed engagement (scroll depth, tap rate)
- AI pipeline: success rate, avg generation time, cost per generation
- Error rate by service

### 4.2 Creator Health Dashboard

- Apps created per creator (distribution)
- Publish rate (created → published)
- Remix rate per creator
- Creator retention (D7, D30)
- Top creators by plays received

### 4.3 Content Quality Dashboard

- Average play duration per app
- Replay rate (same user plays same app twice)
- Like-to-play ratio
- Comment sentiment (stretch: automated)
- Reports per day, resolution rate

### 4.4 AI Pipeline Dashboard

- Generations per hour
- Success rate (pass on first try vs. retries)
- Fix pass distribution (0, 1, 2, 3 passes)
- Failure rate by app category
- Cost per generation (trend over time)
- Model latency P50/P95/P99

---

## 5. Implementation Notes

### 5.1 SDK Integration

```typescript
// amplitude.ts
import * as Amplitude from '@amplitude/analytics-react-native';

export const initAnalytics = () => {
  Amplitude.init(AMPLITUDE_API_KEY, {
    flushEventsOnClose: true,
    minTimeBetweenSessionsMillis: 30 * 60 * 1000, // 30 min session gap
  });
};

export const identify = (userId: string, properties: Record<string, any>) => {
  const identify = new Amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => {
    identify.set(key, value);
  });
  Amplitude.identify(identify);
  Amplitude.setUserId(userId);
};

export const track = (event: string, properties?: Record<string, any>) => {
  Amplitude.track(event, properties);
};
```

### 5.2 Server-Side Events

AI pipeline events (generation time, cost, fix passes) are tracked server-side to avoid client manipulation:

```typescript
// Server-side tracking via Amplitude HTTP API
const trackServerEvent = async (userId: string, event: string, properties: object) => {
  await fetch('https://api2.amplitude.com/2/httpapi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: AMPLITUDE_API_KEY,
      events: [{
        user_id: userId,
        event_type: event,
        event_properties: properties,
        time: Date.now(),
      }]
    })
  });
};
```

### 5.3 Feed Impression & Scroll Depth Tracking

Feed engagement is measured via React Native's `onViewableItemsChanged` callback on FlatList. This fires when the set of visible items changes — not on every scroll frame.

```typescript
// components/feed/FeedList.tsx
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 50,  // Card must be ≥50% visible
  minimumViewTime: 1000,            // For ≥1 second
};

const FeedList = ({ tab }: { tab: 'home' | 'explore' | 'following' }) => {
  const sessionRef = useRef({
    maxDepth: 0,
    impressedCards: new Set<string>(),
    startTime: Date.now(),
  });

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    viewableItems.forEach(({ item, index }) => {
      if (!sessionRef.current.impressedCards.has(item.id)) {
        sessionRef.current.impressedCards.add(item.id);
        track('feed_card_impressed', { app_id: item.id, position: index, tab });
      }
      sessionRef.current.maxDepth = Math.max(sessionRef.current.maxDepth, index);
    });
  }, [tab]);

  // Fire summary event when user leaves the feed tab
  useFocusEffect(
    useCallback(() => {
      sessionRef.current = { maxDepth: 0, impressedCards: new Set(), startTime: Date.now() };
      return () => {
        track('feed_scrolled', {
          max_depth: sessionRef.current.maxDepth,
          cards_impressed: sessionRef.current.impressedCards.size,
          duration_seconds: Math.round((Date.now() - sessionRef.current.startTime) / 1000),
          tab,
        });
      };
    }, [tab])
  );

  return (
    <FlatList
      data={apps}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={VIEWABILITY_CONFIG}
    />
  );
};
```

**Key details:**
- `feed_card_impressed` fires once per card per feed session (deduped via Set)
- `feed_scrolled` fires once when the user leaves the tab — a single summary event
- `max_depth` is the highest card index impressed (not pixels)
- Impression threshold (50% visible, 1 second) is the industry standard (Meta, Google)
- **Tap-through rate** = `feed_card_tapped / feed_card_impressed` (computed in Amplitude)

### 5.4 Play Duration Measurement

Play duration is measured by the native shell, not the WebView:

```typescript
// components/player/AppWebView.tsx
const AppPlayer = ({ app }: { app: App }) => {
  const timerRef = useRef({ start: 0, accumulated: 0, active: true });
  const completedRef = useRef(false);

  useEffect(() => {
    timerRef.current = { start: Date.now(), accumulated: 0, active: true };
    completedRef.current = false;

    track('app_played', {
      app_id: app.id, creator_id: app.creatorId,
      is_multiplayer: app.isMultiplayer, version_id: app.currentVersionId,
      source: route.params.source,
    });

    return () => {
      const totalSeconds = getTotalSeconds();
      track('app_play_duration', {
        app_id: app.id, duration_seconds: totalSeconds,
        completed: completedRef.current, bounced: totalSeconds < 3,
      });
      api.post(`/apps/${app.id}/play`, { duration_seconds: totalSeconds });
    };
  }, [app.id]);

  // Pause on background, resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !timerRef.current.active) {
        timerRef.current.start = Date.now();
        timerRef.current.active = true;
      } else if (state !== 'active' && timerRef.current.active) {
        timerRef.current.accumulated += (Date.now() - timerRef.current.start);
        timerRef.current.active = false;
      }
    });
    return () => sub.remove();
  }, []);

  function getTotalSeconds() {
    let total = timerRef.current.accumulated;
    if (timerRef.current.active) total += (Date.now() - timerRef.current.start);
    return Math.round(total / 1000);
  }

  const handleSDKMessage = (event: WebViewMessageEvent) => {
    const { type } = JSON.parse(event.nativeEvent.data);
    if (type === 'platform:end_session') {
      completedRef.current = true;
    }
    // ... other SDK message handling
  };

  return <WebView onMessage={handleSDKMessage} /* ... */ />;
};
```

**Key details:**
- Timer is native-side — WebView cannot manipulate it
- Background time excluded (only active foreground time counted)
- `bounced` = duration < 3 seconds (opened and immediately left)
- `completed` set when app calls `window.vibe.platform.endSession()`
- Timer does NOT stop on endSession — users often replay or linger on game-over screens
- `POST /apps/:id/play` records to `play_sessions` table for the feed algorithm

### 5.5 Game Completion Signaling

Generated apps call `window.vibe.platform.endSession()` when reaching a natural end state:

```javascript
// Inside a generated Phaser game's GameOver scene
window.vibe.platform.endSession({
  score: finalScore,
  reason: 'game_over',         // 'game_over' | 'completed' | 'story_end'
  metadata: { level: 5 }
});
```

- Sets `completed` flag on native-side tracker
- Optionally submits score (equivalent to `vibe.score.submit`)
- Does NOT close the player or stop the timer
- Can be called multiple times (replays) — only first call sets `completed`
- Generator system prompt instructs it to call `endSession()` on game-over screens

### 5.6 Bounce Detection

A bounce is a play session under 3 seconds. Derived from `play_sessions.duration_seconds`, not a separate event.

```ruby
# In QualityScoreCalculator
def bounce_rate(app)
  total = app.play_sessions.count
  return 0.0 if total < 5
  app.play_sessions.where('duration_seconds < 3').count.to_f / total
end
```

Apps with >50% bounce rate get a quality score penalty (see Feed Algorithm doc §2.4).
