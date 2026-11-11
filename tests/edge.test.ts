import http from "node:http";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DIST, buildAll, startEdge, type CatalogItem, type Edge } from "@vibe/build";

let edge: Edge;
let catalog: CatalogItem[];

function get(host: string, p: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: edge.port, path: p, headers: { host: `${host}:${edge.port}`, ...headers } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

beforeAll(async () => {
  catalog = await buildAll({ quiet: true });
  edge = await startEdge({ port: 0 });
});
afterAll(async () => {
  rmSync(path.join(DIST, "blocked.json"), { force: true });
  await edge.close();
});

describe("edge: game origins", () => {
  it("serves a game document into an iframe with the platform injected and strict headers", async () => {
    const g = catalog.find((c) => c.gameId === "hop")!;
    const r = await get(`hop.games.localhost`, `/v/${g.versionId}/`, { "sec-fetch-dest": "iframe" });
    expect(r.status).toBe(200);
    expect(r.body).not.toContain("<!-- vibe:platform -->");
    expect(r.body).toMatch(/<script src="http:\/\/engine\.games\.localhost:\d+\/sdk\/1\.0\.0\/vibe\.js" integrity="sha384-/);
    expect(r.body).toContain("/phaser/4.2.1/phaser.min.js");
    const csp = String(r.headers["content-security-policy"]);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain(`frame-ancestors ${edge.origins.app}`);
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("form-action 'none'");
    expect(r.headers["permissions-policy"]).toContain("camera=()");
    expect(r.headers["referrer-policy"]).toBe("no-referrer");
  });

  it("redirects a direct (top-level) visit to the game's page in the app", async () => {
    const g = catalog[0]!;
    const r = await get(`${g.gameId}.games.localhost`, `/v/${g.versionId}/`, { "sec-fetch-dest": "document" });
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe(`${edge.origins.app}/play.html?game=${g.gameId}`);
  });

  it("only serves files of the requested game version, and blocks path traversal", async () => {
    const g = catalog[0]!;
    const other = catalog[1]!;
    expect((await get(`${g.gameId}.games.localhost`, `/v/${other.versionId}/main.js`)).status).toBe(404);
    expect((await get(`${g.gameId}.games.localhost`, `/v/${g.versionId}/..%2F..%2F..%2Fpackage.json`)).status).toBe(404);
    expect((await get(`${g.gameId}.games.localhost`, `/v/${g.versionId}/main.js`)).headers["cache-control"]).toContain("immutable");
  });

  it("kill switch: blocked games return 410 within one request", async () => {
    const g = catalog[0]!;
    writeFileSync(path.join(DIST, "blocked.json"), JSON.stringify({ games: [g.gameId] }));
    expect((await get(`${g.gameId}.games.localhost`, `/v/${g.versionId}/`, { "sec-fetch-dest": "iframe" })).status).toBe(410);
    rmSync(path.join(DIST, "blocked.json"));
    expect((await get(`${g.gameId}.games.localhost`, `/v/${g.versionId}/`, { "sec-fetch-dest": "iframe" })).status).toBe(200);
  });
});

describe("edge: engine and app", () => {
  it("serves engine files cross-origin with long-lived caching", async () => {
    const r = await get("engine.games.localhost", "/sdk/1.0.0/vibe.js");
    expect(r.status).toBe(200);
    expect(r.headers["access-control-allow-origin"]).toBe("*");
    expect(r.headers["cache-control"]).toContain("immutable");
  });

  it("app pages may only frame game origins", async () => {
    const r = await get("app.localhost", "/");
    expect(r.status).toBe(200);
    expect(String(r.headers["content-security-policy"])).toContain(`frame-src ${edge.origins.gamesSource}`);
    const cfg = JSON.parse((await get("app.localhost", "/config.json")).body);
    expect(cfg.gameUrlTemplate).toContain("{game}.games.localhost");
  });
});
