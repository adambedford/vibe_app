# Vibe — Multiplayer SDK Specification (`window.vibe`)

**Version:** 3.0 (Build-Ready)
**Last Updated:** 2026-03-28
**Status:** Ready for Engineering

---

## 1. Overview

The Vibe SDK is a JavaScript API injected into every app's WebView at runtime. It provides multiplayer primitives, player identity, and platform integration to AI-generated apps. Generated apps call `window.vibe.*` methods; the SDK communicates with the native shell via `postMessage` bridge, which in turn connects to the backend real-time infrastructure.

**Key Principle:** The SDK is the only sanctioned way for apps to communicate outside their sandbox. All other network access is blocked by CSP.

---

## 2. Injection Mechanism

Phaser 3, Tone.js, and the Vibe SDK are all injected before the app's HTML loads via `injectedJavaScriptBeforeContentLoaded` on the React Native WebView. This eliminates CDN dependencies at runtime — all three libraries are bundled with the React Native binary.

```typescript
// Native side (React Native)
const PRELOADED_LIBS = [
  require('./lib/phaser.min.js'),   // ~1MB, game engine
  require('./lib/tone.min.js'),     // ~150KB, audio synthesis
  require('./sdk/vibe-sdk.js'),     // ~15KB, multiplayer SDK
].join('\n');

<WebView
  injectedJavaScriptBeforeContentLoaded={PRELOADED_LIBS}
  onMessage={handleSDKMessage}
  // ... other config (see Tech Architecture doc §2.3)
/>
```

By the time the app's HTML loads, `Phaser`, `Tone`, and `window.vibe` are all available as globals. The Generator still outputs `<script src="cdn...">` tags in the HTML (needed for Validator testing), but the client strips them before loading since the libraries are already injected.

The SDK sets up `window.vibe` and a bidirectional message bridge:

```javascript
// SDK internals (simplified)
window.vibe = {
  _bridge: {
    send(type, payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
    },
    _handlers: {},
    on(type, callback) {
      this._handlers[type] = this._handlers[type] || [];
      this._handlers[type].push(callback);
    }
  },
  // ... public API namespaces
};

// Receive messages from native shell
window.addEventListener('message', (event) => {
  const { type, payload } = JSON.parse(event.data);
  const handlers = window.vibe._bridge._handlers[type] || [];
  handlers.forEach(h => h(payload));
});
```

---

## 3. API Reference

### 3.1 Player Identity

Available immediately on load. No async initialization required.

```typescript
interface VibePlayer {
  id: string;           // Unique user ID (UUID)
  name: string;         // Display name
  avatar: string;       // Avatar URL
}

// Current player (always available)
window.vibe.player.id      // "usr_abc123"
window.vibe.player.name    // "Alex"
window.vibe.player.avatar  // "https://cdn.vibe.app/avatars/abc123.jpg"

// All players in current session (empty array if solo)
window.vibe.players        // VibePlayer[]
```

### 3.2 Lobby

Create, join, and manage multiplayer game sessions.

```typescript
// Create a new lobby (host only)
await window.vibe.lobby.create({
  maxPlayers: number,      // 2–8, required
  isPublic?: boolean,      // Default: false (invite-only)
  metadata?: object        // Arbitrary game-specific data
})
// Returns: { lobbyId: string, inviteLink: string }

// Join an existing lobby
await window.vibe.lobby.join(lobbyId: string)
// Returns: { lobbyId: string, players: VibePlayer[], host: VibePlayer }

// Leave the current lobby
await window.vibe.lobby.leave()

// Start the game (host only, transitions lobby → active session)
await window.vibe.lobby.start()

// Event listeners
window.vibe.lobby.onPlayerJoined(callback: (player: VibePlayer) => void)
window.vibe.lobby.onPlayerLeft(callback: (player: VibePlayer) => void)
window.vibe.lobby.onGameStart(callback: (session: { players: VibePlayer[] }) => void)
window.vibe.lobby.onError(callback: (error: { code: string, message: string }) => void)

// Lobby state
window.vibe.lobby.getPlayers()    // VibePlayer[]
window.vibe.lobby.isHost()        // boolean
window.vibe.lobby.id              // string | null
```

**Error Codes:**
| Code | Meaning |
|---|---|
| `LOBBY_FULL` | Lobby has reached maxPlayers |
| `LOBBY_NOT_FOUND` | Invalid or expired lobbyId |
| `LOBBY_ALREADY_STARTED` | Game already in progress |
| `NOT_HOST` | Action requires host privileges |
| `ALREADY_IN_LOBBY` | Player is already in a lobby |

### 3.3 State Sync

Real-time key-value state synchronized across all players in a session.

```typescript
// Set a value (broadcast to all players)
window.vibe.state.set(key: string, value: any)
// Value must be JSON-serializable. Max 64KB per message.

// Get current value of a key
window.vibe.state.get(key: string)  // any | undefined

// Get all state as a plain object
window.vibe.state.getAll()  // Record<string, any>

// Listen for state updates from other players
window.vibe.state.onUpdate(callback: (update: {
  key: string,
  value: any,
  playerId: string   // Who made the change
}) => void)

// Listen for a specific key
window.vibe.state.onKeyUpdate(key: string, callback: (value: any, playerId: string) => void)

// Batch update (send multiple keys atomically)
window.vibe.state.setBatch(updates: Record<string, any>)
```

**Conflict Resolution:** Last-write-wins. The server timestamps all updates and the most recent write for each key wins. For apps requiring more sophisticated conflict resolution, use the turn system to serialize writes.

**Performance Notes:**
- Updates are debounced at 50ms on the client (configurable)
- Maximum update frequency: 20 updates/second per player
- Maximum state size: 1MB total per session
- State is ephemeral — cleared when session ends

### 3.4 Turn System

Turn-based game management with timers and ordering.

```typescript
// Start turn-based play (host only)
await window.vibe.turns.start({
  order: 'round_robin' | 'random' | 'host_assigned',
  timerSeconds?: number,       // Per-turn timer (0 = no timer)
  playerOrder?: string[]       // Required if order === 'host_assigned' (array of player IDs)
})

// End current player's turn (current player only)
await window.vibe.turns.end(turnData?: any)
// turnData is optional arbitrary data passed to onTurnEnd listeners

// Skip a player's turn (host only)
await window.vibe.turns.skip(playerId: string)

// Get current turn state
window.vibe.turns.getCurrentPlayer()   // VibePlayer
window.vibe.turns.getTurnNumber()      // number (1-indexed)
window.vibe.turns.getTimeRemaining()   // number (seconds, -1 if no timer)
window.vibe.turns.isMyTurn()           // boolean

// Event listeners
window.vibe.turns.onTurnStart(callback: (turn: {
  player: VibePlayer,
  turnNumber: number,
  timerSeconds: number
}) => void)

window.vibe.turns.onTurnEnd(callback: (result: {
  player: VibePlayer,
  turnNumber: number,
  turnData: any,
  reason: 'completed' | 'timeout' | 'skipped'
}) => void)

window.vibe.turns.onGameOver(callback: (result: {
  reason: 'all_turns_complete' | 'host_ended',
  finalState: Record<string, any>
}) => void)
```

### 3.5 Scoreboard

Per-app persistent leaderboard.

```typescript
// Submit a score (current player)
await window.vibe.score.submit(
  score: number,
  metadata?: object    // Game-specific data (e.g., { level: 5, timeSeconds: 42 })
)

// Get leaderboard
await window.vibe.score.getLeaderboard({
  limit?: number,        // Default: 10, max: 50
  scope?: 'global' | 'friends'   // Default: 'global'
})
// Returns: Array<{ player: VibePlayer, score: number, metadata: object, rank: number, createdAt: string }>

// Get current player's best score
await window.vibe.score.getMyBest()
// Returns: { score: number, metadata: object, rank: number } | null
```

### 3.6 Platform Integration

Utility methods for interacting with the platform shell.

```typescript
// Signal that the app reached a natural end state (game over, quiz results, story ending)
window.vibe.platform.endSession(result?: {
  score?: number,
  reason?: 'game_over' | 'completed' | 'story_end' | 'quit',
  metadata?: object
})
// Sets the "completed" flag on the native play duration tracker.
// Optionally submits a score (equivalent to vibe.score.submit).
// Does NOT close the player or stop the timer — users can replay or linger.
// Can be called multiple times (replays); only the first call sets "completed".
// The Generator should call this on game-over screens, quiz results, and story endings.

// Share the current app
window.vibe.platform.share()
// Triggers native share sheet with deep link to this app

// Exit the app (return to feed)
window.vibe.platform.exit()

// Haptic feedback
window.vibe.platform.haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error')

// Get screen dimensions (safe area)
window.vibe.platform.getSafeArea()
// Returns: { top: number, bottom: number, left: number, right: number }
// Insets in CSS pixels for notch/home indicator avoidance

// Sound effects (platform-provided UI sounds)
window.vibe.platform.playSound(name: 'tap' | 'success' | 'error' | 'score' | 'countdown' | 'explosion')
// These are short UI feedback sounds. For game audio (music, custom SFX),
// apps should use Tone.js directly (pre-loaded by the platform).
```

---

## 4. Native Bridge Protocol

Messages between the WebView and native shell are JSON objects with `type` and `payload`:

### WebView → Native (Outbound)

```json
{ "type": "lobby:create", "payload": { "maxPlayers": 4 } }
{ "type": "state:set", "payload": { "key": "board", "value": [...] } }
{ "type": "turns:end", "payload": { "turnData": { "move": "e4" } } }
{ "type": "score:submit", "payload": { "score": 1500, "metadata": {} } }
{ "type": "platform:end_session", "payload": { "score": 1500, "reason": "game_over", "metadata": {} } }
{ "type": "platform:share", "payload": {} }
{ "type": "platform:haptic", "payload": { "type": "success" } }
```

### Native → WebView (Inbound)

```json
{ "type": "lobby:player_joined", "payload": { "player": { "id": "...", "name": "...", "avatar": "..." } } }
{ "type": "state:update", "payload": { "key": "board", "value": [...], "playerId": "usr_abc" } }
{ "type": "turns:start", "payload": { "player": {...}, "turnNumber": 3, "timerSeconds": 30 } }
{ "type": "lobby:error", "payload": { "code": "LOBBY_FULL", "message": "..." } }
```

### Promise Resolution

Async SDK methods (those returning Promises) use a request/response pattern:

```json
// Outbound (request)
{ "type": "lobby:create", "payload": { "maxPlayers": 4 }, "_reqId": "req_001" }

// Inbound (response)
{ "type": "lobby:create:response", "payload": { "lobbyId": "...", "inviteLink": "..." }, "_reqId": "req_001" }

// Inbound (error)
{ "type": "lobby:create:error", "payload": { "code": "...", "message": "..." }, "_reqId": "req_001" }
```

---

## 5. Versioning

All three injected libraries are bundled with the React Native binary and versioned together:

| Library | Bundled Version | Update Cadence |
|---|---|---|
| Phaser 3 | 3.x (pinned) | With app releases |
| Tone.js | latest stable (pinned) | With app releases |
| Vibe SDK | 1.0.0 | With app releases |

This means:
- Library versions are tied to the app binary version
- Breaking changes to any library require a new app release
- Generated apps target the Phaser/Tone.js/SDK versions available at generation time
- The Generator's system prompt is updated alongside library changes to keep them in sync
- The Validator sidecar must run the same Phaser/Tone.js versions as the current app binary

---

## 6. Testing the SDK

For local development and CI, a mock SDK is provided:

```javascript
// vibe-sdk-mock.js — used in headless browser validation
window.vibe = {
  player: { id: 'test_user_1', name: 'Test Player', avatar: '' },
  players: [{ id: 'test_user_1', name: 'Test Player', avatar: '' }],
  lobby: {
    create: async () => ({ lobbyId: 'test_lobby', inviteLink: '' }),
    join: async () => ({ lobbyId: 'test_lobby', players: [], host: window.vibe.player }),
    leave: async () => {},
    start: async () => {},
    onPlayerJoined: () => {},
    onPlayerLeft: () => {},
    onGameStart: () => {},
    onError: () => {},
    getPlayers: () => [window.vibe.player],
    isHost: () => true,
    id: 'test_lobby'
  },
  state: {
    _store: {},
    set(k, v) { this._store[k] = v; },
    get(k) { return this._store[k]; },
    getAll() { return { ...this._store }; },
    setBatch(u) { Object.assign(this._store, u); },
    onUpdate: () => {},
    onKeyUpdate: () => {},
  },
  turns: {
    start: async () => {},
    end: async () => {},
    skip: async () => {},
    getCurrentPlayer: () => window.vibe.player,
    getTurnNumber: () => 1,
    getTimeRemaining: () => -1,
    isMyTurn: () => true,
    onTurnStart: () => {},
    onTurnEnd: () => {},
    onGameOver: () => {},
  },
  score: {
    submit: async () => {},
    getLeaderboard: async () => [],
    getMyBest: async () => null,
  },
  platform: {
    share: () => {},
    exit: () => {},
    haptic: () => {},
    endSession: () => {},
    getSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    playSound: () => {},
  }
};
```
