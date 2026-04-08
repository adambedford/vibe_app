/**
 * WebView utilities for the App Player.
 *
 * Handles:
 * - Injecting Phaser 3, Tone.js, and the Vibe SDK before app HTML loads
 * - Stripping CDN <script> tags (libraries are pre-injected)
 * - Populating player identity in the SDK
 */

// In production, these would be bundled with the RN binary via require().
// For now, the SDK source is loaded from the monorepo packages dir.
// Phaser and Tone.js are loaded via the CDN tags in the HTML for development.
// In production builds, they'd be bundled assets injected here.

const VIBE_SDK_SOURCE = `
(function() {
  "use strict";
  var _reqCounter = 0;
  var _pendingRequests = {};

  var _bridge = {
    send: function(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
      }
    },
    sendAsync: function(type, payload) {
      return new Promise(function(resolve, reject) {
        var reqId = "req_" + (++_reqCounter);
        _pendingRequests[reqId] = { resolve: resolve, reject: reject };
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload, _reqId: reqId }));
        }
        setTimeout(function() {
          if (_pendingRequests[reqId]) {
            delete _pendingRequests[reqId];
            reject(new Error("SDK request " + type + " timed out"));
          }
        }, 10000);
      });
    },
    _handlers: {},
    on: function(type, callback) {
      if (!this._handlers[type]) this._handlers[type] = [];
      this._handlers[type].push(callback);
    },
    _emit: function(type, payload) {
      var handlers = this._handlers[type] || [];
      handlers.forEach(function(h) { h(payload); });
    }
  };

  window.addEventListener("message", function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data._reqId && _pendingRequests[data._reqId]) {
        if (data.type.endsWith(":error")) {
          _pendingRequests[data._reqId].reject(data.payload);
        } else {
          _pendingRequests[data._reqId].resolve(data.payload);
        }
        delete _pendingRequests[data._reqId];
        return;
      }
      _bridge._emit(data.type, data.payload);
    } catch(e) {}
  });

  var _stateStore = {};
  var _stateDebounce = {};

  window.vibe = {
    _bridge: _bridge,
    player: { id: "", name: "", avatar: "" },
    players: [],
    lobby: {
      id: null,
      create: function(opts) { return _bridge.sendAsync("lobby:create", opts); },
      join: function(id) { return _bridge.sendAsync("lobby:join", { lobbyId: id }); },
      leave: function() { return _bridge.sendAsync("lobby:leave", {}); },
      start: function() { return _bridge.sendAsync("lobby:start", {}); },
      onPlayerJoined: function(cb) { _bridge.on("lobby:player_joined", function(p) { cb(p.player); }); },
      onPlayerLeft: function(cb) { _bridge.on("lobby:player_left", function(p) { cb(p.player); }); },
      onGameStart: function(cb) { _bridge.on("lobby:game_start", cb); },
      onError: function(cb) { _bridge.on("lobby:error", cb); },
      getPlayers: function() { return window.vibe.players; },
      isHost: function() { return window.vibe._isHost || false; }
    },
    state: {
      set: function(k, v) {
        _stateStore[k] = v;
        clearTimeout(_stateDebounce[k]);
        _stateDebounce[k] = setTimeout(function() { _bridge.send("state:set", { key: k, value: v }); }, 50);
      },
      get: function(k) { return _stateStore[k]; },
      getAll: function() { return Object.assign({}, _stateStore); },
      setBatch: function(u) { Object.assign(_stateStore, u); _bridge.send("state:set_batch", u); },
      onUpdate: function(cb) { _bridge.on("state:update", cb); },
      onKeyUpdate: function(k, cb) { _bridge.on("state:update", function(u) { if (u.key === k) cb(u.value, u.playerId); }); }
    },
    turns: {
      start: function(opts) { return _bridge.sendAsync("turns:start", opts || {}); },
      end: function(d) { return _bridge.sendAsync("turns:end", { turnData: d }); },
      skip: function(id) { return _bridge.sendAsync("turns:skip", { playerId: id }); },
      getCurrentPlayer: function() { return window.vibe._currentTurnPlayer || null; },
      getTurnNumber: function() { return window.vibe._turnNumber || 0; },
      getTimeRemaining: function() { return window.vibe._timeRemaining || -1; },
      isMyTurn: function() { var c = window.vibe.turns.getCurrentPlayer(); return c ? c.id === window.vibe.player.id : false; },
      onTurnStart: function(cb) { _bridge.on("turns:start", cb); },
      onTurnEnd: function(cb) { _bridge.on("turns:end", cb); },
      onGameOver: function(cb) { _bridge.on("turns:game_over", cb); }
    },
    score: {
      submit: function(s, m) { return _bridge.sendAsync("score:submit", { score: s, metadata: m || {} }); },
      getLeaderboard: function(opts) { return _bridge.sendAsync("score:get_leaderboard", opts || {}); },
      getMyBest: function() { return _bridge.sendAsync("score:get_my_best", {}); }
    },
    platform: {
      _ended: false,
      endSession: function(r) {
        if (!this._ended) {
          this._ended = true;
          _bridge.send("platform:end_session", { score: r && r.score, reason: (r && r.reason) || "completed", metadata: (r && r.metadata) || {} });
        }
      },
      share: function() { _bridge.send("platform:share", {}); },
      exit: function() { _bridge.send("platform:exit", {}); },
      haptic: function(t) { _bridge.send("platform:haptic", { type: t || "light" }); },
      getSafeArea: function() { return window.vibe._safeArea || { top: 0, bottom: 0, left: 0, right: 0 }; },
      playSound: function(n) { _bridge.send("platform:play_sound", { name: n }); }
    }
  };

  _bridge.on("state:update", function(u) { _stateStore[u.key] = u.value; });
})();
`;

/**
 * Build the JavaScript string to inject before app HTML loads.
 * Sets up player identity in the SDK.
 */
export function getInjectedSDK(user: { id: number; display_name: string; avatar_url?: string | null } | null): string {
  const playerSetup = user
    ? `window.vibe.player = { id: "${user.id}", name: ${JSON.stringify(user.display_name)}, avatar: ${JSON.stringify(user.avatar_url || "")} };
       window.vibe.players = [window.vibe.player];`
    : `window.vibe.player = { id: "anonymous", name: "Player", avatar: "" };
       window.vibe.players = [window.vibe.player];`;

  // In production, Phaser and Tone.js would be bundled here too:
  // const PHASER_SOURCE = require('./lib/phaser.min.js');
  // const TONE_SOURCE = require('./lib/tone.min.js');
  // return [PHASER_SOURCE, TONE_SOURCE, VIBE_SDK_SOURCE, playerSetup].join('\n');

  return [VIBE_SDK_SOURCE, playerSetup].join('\n');
}

/**
 * Strip CDN <script> tags from generated HTML.
 * The Generator includes these for Validator testing, but the client
 * pre-loads libraries via injectedJavaScriptBeforeContentLoaded.
 *
 * In development, we keep them so apps work without bundled Phaser/Tone.
 * In production, uncomment the stripping.
 */
export function stripCDNTags(html: string): string {
  // Production: strip CDN tags since libraries are injected
  // return html.replace(/<script[^>]*cdn\.jsdelivr\.net[^>]*><\/script>/g, '');

  // Development: keep CDN tags so Phaser/Tone load from network
  return html;
}
