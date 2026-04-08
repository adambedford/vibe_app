/**
 * Vibe SDK v1.0.0
 * Injected into every app's WebView before app HTML loads.
 * Provides multiplayer primitives, player identity, and platform integration.
 */
(function () {
  "use strict";

  let _reqCounter = 0;
  const _pendingRequests = {};

  // --- Bridge ---
  const _bridge = {
    send(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type, payload })
        );
      }
    },

    sendAsync(type, payload) {
      return new Promise((resolve, reject) => {
        const reqId = `req_${++_reqCounter}`;
        _pendingRequests[reqId] = { resolve, reject };

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type, payload, _reqId: reqId })
          );
        }

        // Timeout after 10 seconds
        setTimeout(() => {
          if (_pendingRequests[reqId]) {
            delete _pendingRequests[reqId];
            reject(new Error(`SDK request ${type} timed out`));
          }
        }, 10000);
      });
    },

    _handlers: {},

    on(type, callback) {
      if (!this._handlers[type]) this._handlers[type] = [];
      this._handlers[type].push(callback);
    },

    _emit(type, payload) {
      const handlers = this._handlers[type] || [];
      handlers.forEach((h) => h(payload));
    },
  };

  // Receive messages from native shell
  window.addEventListener("message", (event) => {
    try {
      const { type, payload, _reqId } = JSON.parse(event.data);

      // Handle promise responses
      if (_reqId && _pendingRequests[_reqId]) {
        if (type.endsWith(":error")) {
          _pendingRequests[_reqId].reject(payload);
        } else {
          _pendingRequests[_reqId].resolve(payload);
        }
        delete _pendingRequests[_reqId];
        return;
      }

      // Handle event broadcasts
      _bridge._emit(type, payload);
    } catch (e) {
      // Ignore non-JSON messages
    }
  });

  // --- Player ---
  const player = {
    id: "",
    name: "",
    avatar: "",
  };

  // --- Lobby ---
  const lobby = {
    id: null,

    async create({ maxPlayers, isPublic = false, metadata = {} }) {
      return _bridge.sendAsync("lobby:create", { maxPlayers, isPublic, metadata });
    },

    async join(lobbyId) {
      return _bridge.sendAsync("lobby:join", { lobbyId });
    },

    async leave() {
      return _bridge.sendAsync("lobby:leave", {});
    },

    async start() {
      return _bridge.sendAsync("lobby:start", {});
    },

    onPlayerJoined(callback) {
      _bridge.on("lobby:player_joined", (p) => callback(p.player));
    },

    onPlayerLeft(callback) {
      _bridge.on("lobby:player_left", (p) => callback(p.player));
    },

    onGameStart(callback) {
      _bridge.on("lobby:game_start", callback);
    },

    onError(callback) {
      _bridge.on("lobby:error", callback);
    },

    getPlayers() {
      return window.vibe.players;
    },

    isHost() {
      return window.vibe._isHost || false;
    },
  };

  // --- State Sync ---
  const _stateStore = {};
  const _stateDebounce = {};

  const state = {
    set(key, value) {
      _stateStore[key] = value;

      // Debounce at 50ms
      clearTimeout(_stateDebounce[key]);
      _stateDebounce[key] = setTimeout(() => {
        _bridge.send("state:set", { key, value });
      }, 50);
    },

    get(key) {
      return _stateStore[key];
    },

    getAll() {
      return { ..._stateStore };
    },

    setBatch(updates) {
      Object.assign(_stateStore, updates);
      _bridge.send("state:set_batch", updates);
    },

    onUpdate(callback) {
      _bridge.on("state:update", callback);
    },

    onKeyUpdate(key, callback) {
      _bridge.on("state:update", (update) => {
        if (update.key === key) callback(update.value, update.playerId);
      });
    },
  };

  // Apply remote state updates
  _bridge.on("state:update", (update) => {
    _stateStore[update.key] = update.value;
  });

  // --- Turns ---
  const turns = {
    async start({ order = "round_robin", timerSeconds = 0, playerOrder } = {}) {
      return _bridge.sendAsync("turns:start", { order, timerSeconds, playerOrder });
    },

    async end(turnData) {
      return _bridge.sendAsync("turns:end", { turnData });
    },

    async skip(playerId) {
      return _bridge.sendAsync("turns:skip", { playerId });
    },

    getCurrentPlayer() {
      return window.vibe._currentTurnPlayer || null;
    },

    getTurnNumber() {
      return window.vibe._turnNumber || 0;
    },

    getTimeRemaining() {
      return window.vibe._timeRemaining || -1;
    },

    isMyTurn() {
      const current = this.getCurrentPlayer();
      return current ? current.id === window.vibe.player.id : false;
    },

    onTurnStart(callback) {
      _bridge.on("turns:start", callback);
    },

    onTurnEnd(callback) {
      _bridge.on("turns:end", callback);
    },

    onGameOver(callback) {
      _bridge.on("turns:game_over", callback);
    },
  };

  // --- Scoreboard ---
  const score = {
    async submit(scoreValue, metadata = {}) {
      return _bridge.sendAsync("score:submit", { score: scoreValue, metadata });
    },

    async getLeaderboard({ limit = 10, scope = "global" } = {}) {
      return _bridge.sendAsync("score:get_leaderboard", { limit, scope });
    },

    async getMyBest() {
      return _bridge.sendAsync("score:get_my_best", {});
    },
  };

  // --- Platform ---
  let _endSessionCalled = false;

  const platform = {
    endSession(result = {}) {
      if (!_endSessionCalled) {
        _endSessionCalled = true;
        _bridge.send("platform:end_session", {
          score: result.score,
          reason: result.reason || "completed",
          metadata: result.metadata || {},
        });
      }
      // If score provided, also submit to scoreboard
      if (result.score !== undefined) {
        score.submit(result.score, result.metadata || {}).catch(() => {});
      }
    },

    share() {
      _bridge.send("platform:share", {});
    },

    exit() {
      _bridge.send("platform:exit", {});
    },

    haptic(type = "light") {
      _bridge.send("platform:haptic", { type });
    },

    getSafeArea() {
      return window.vibe._safeArea || { top: 0, bottom: 0, left: 0, right: 0 };
    },

    playSound(name) {
      _bridge.send("platform:play_sound", { name });
    },
  };

  // --- Expose global ---
  window.vibe = {
    _bridge,
    _isHost: false,
    _currentTurnPlayer: null,
    _turnNumber: 0,
    _timeRemaining: -1,
    _safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
    player,
    players: [],
    lobby,
    state,
    turns,
    score,
    platform,
  };
})();
