/**
 * Vibe SDK Mock — used in headless browser validation and tests.
 */
window.vibe = {
  player: { id: "test_user_1", name: "Test Player", avatar: "" },
  players: [{ id: "test_user_1", name: "Test Player", avatar: "" }],
  lobby: {
    create: async () => ({ lobbyId: "test_lobby", inviteLink: "" }),
    join: async () => ({ lobbyId: "test_lobby", players: [], host: window.vibe.player }),
    leave: async () => {},
    start: async () => {},
    onPlayerJoined: () => {},
    onPlayerLeft: () => {},
    onGameStart: () => {},
    onError: () => {},
    getPlayers: () => [window.vibe.player],
    isHost: () => true,
    id: "test_lobby",
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
  },
};
