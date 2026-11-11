/**
 * Where the app, the engine CDN and each game live. Locally everything is one server
 * routing by Host header; *.localhost resolves to loopback in Chromium and Firefox.
 *
 *   app      http://app.localhost:PORT
 *   engine   http://engine.games.localhost:PORT
 *   game     http://<gameId>.games.localhost:PORT/v/<versionId>/
 *
 * The app and the games are different sites, and every game has its own origin.
 */
export interface Origins {
  app: string;
  engine: string;
  /** Hostname suffix shared by all game origins, e.g. ".games.localhost". */
  gamesSuffix: string;
  /** URL template with {game} and {version}. */
  gameUrlTemplate: string;
  /** CSP source matching every game origin. */
  gamesSource: string;
}

export const RESERVED_GAME_IDS = new Set(["engine", "app", "www", "api"]);

export function localOrigins(port: number): Origins {
  return {
    app: `http://app.localhost:${port}`,
    engine: `http://engine.games.localhost:${port}`,
    gamesSuffix: ".games.localhost",
    gameUrlTemplate: `http://{game}.games.localhost:${port}/v/{version}/`,
    gamesSource: `http://*.games.localhost:${port}`,
  };
}

export function gameUrl(o: Pick<Origins, "gameUrlTemplate">, gameId: string, versionId: string): string {
  return o.gameUrlTemplate.replace("{game}", gameId).replace("{version}", versionId);
}
