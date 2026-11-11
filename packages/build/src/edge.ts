/**
 * Local stand-in for the production edge: one HTTP server that routes by Host header to
 * the app, the engine CDN, or a game origin, and sets the security headers from
 * docs/design/01-game-runtime.md §2. The checks harness starts the same server in-process.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import type { Manifest } from "@vibe/protocol";
import { localOrigins, type Origins } from "./origins.ts";
import { DIST, DIST_APP, DIST_ENGINE, DIST_GAMES, PLATFORM_MARKER, enginePath, sdkPath } from "./paths.ts";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

const PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), " +
  "display-capture=(), clipboard-read=(), publickey-credentials-get=(), xr-spatial-tracking=()";

export function gameCsp(o: Origins): string {
  return [
    "default-src 'none'",
    `script-src 'self' ${o.engine} 'unsafe-inline' 'wasm-unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    `frame-ancestors ${o.app}`,
  ].join("; ");
}

export function appCsp(o: Origins): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `frame-src ${o.gamesSource}`,
    "connect-src 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function sri(buf: Buffer): string {
  return "sha384-" + createHash("sha384").update(buf).digest("base64");
}

export function injectPlatform(html: string, manifest: Manifest, o: Origins, integrity: Record<string, string>): string {
  const tags: string[] = [];
  const add = (p: string) => {
    const i = integrity[p];
    tags.push(`<script src="${o.engine}${p}"${i ? ` integrity="${i}"` : ""} crossorigin="anonymous"></script>`);
  };
  add(sdkPath(manifest.sdk));
  if (manifest.engine.name !== "none") add(enginePath(manifest.engine.name, manifest.engine.version));
  return html.replace(PLATFORM_MARKER, tags.join("\n"));
}

export interface Edge {
  server: http.Server;
  origins: Origins;
  port: number;
  close(): Promise<void>;
}

export async function startEdge(opts: { port?: number } = {}): Promise<Edge> {
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(opts.port ?? 4100, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const origins = localOrigins(port);
  server.on("request", (req, res) => {
    handle(req, res, origins).catch((err) => {
      console.error("edge error", err);
      if (!res.headersSent) res.writeHead(500);
      res.end("internal error");
    });
  });
  return {
    server,
    origins,
    port,
    close: () => new Promise((r) => server.close(() => r())),
  };
}

function hostnameOf(req: http.IncomingMessage) {
  return (req.headers.host ?? "").toLowerCase().replace(/:\d+$/, "");
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse, o: Origins) {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "method not allowed");
  const host = hostnameOf(req);
  const url = new URL(req.url ?? "/", "http://local");
  const engineHost = new URL(o.engine).hostname;
  const appHost = new URL(o.app).hostname;

  if (host === appHost) return serveApp(url, res, o);
  if (host === engineHost) return serveEngine(url, res);
  if (host.endsWith(o.gamesSuffix)) return serveGame(host.slice(0, -o.gamesSuffix.length), url, req, res, o);
  res.writeHead(302, { Location: `${o.app}/` });
  res.end();
}

function safeJoin(root: string, rel: string): string | null {
  const p = path.normalize(path.join(root, decodeURIComponent(rel)));
  return p.startsWith(root + path.sep) || p === root ? p : null;
}

async function fileOrNull(p: string | null): Promise<Buffer | null> {
  if (!p || !existsSync(p) || !statSync(p).isFile()) return null;
  return readFile(p);
}

function send(res: http.ServerResponse, status: number, body: string | Buffer, headers: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...headers });
  res.end(body);
}

async function serveApp(url: URL, res: http.ServerResponse, o: Origins) {
  const headers = {
    "Content-Security-Policy": appCsp(o),
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache",
  };
  if (url.pathname === "/config.json") {
    return send(res, 200, JSON.stringify({ gameUrlTemplate: o.gameUrlTemplate, engine: o.engine }), {
      ...headers,
      "Content-Type": TYPES[".json"]!,
    });
  }
  const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const p = safeJoin(DIST_APP, rel);
  const body = await fileOrNull(p);
  if (!body) return send(res, 404, "not found", headers);
  send(res, 200, body, { ...headers, "Content-Type": TYPES[path.extname(p!)] ?? "application/octet-stream" });
}

async function serveEngine(url: URL, res: http.ServerResponse) {
  const p = safeJoin(DIST_ENGINE, url.pathname.slice(1));
  const body = await fileOrNull(p);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (!body) return send(res, 404, "not found", headers);
  send(res, 200, body, {
    ...headers,
    "Content-Type": TYPES[path.extname(p!)] ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
}

let blockedCache: { mtime: number; games: Set<string>; versions: Set<string> } | null = null;
function blocked(gameId: string, versionId: string): boolean {
  const f = path.join(DIST, "blocked.json");
  if (!existsSync(f)) return false;
  const mtime = statSync(f).mtimeMs;
  if (!blockedCache || blockedCache.mtime !== mtime) {
    const j = JSON.parse(readFileSync(f, "utf8")) as { games?: string[]; versions?: string[] };
    blockedCache = { mtime, games: new Set(j.games ?? []), versions: new Set(j.versions ?? []) };
  }
  return blockedCache.games.has(gameId) || blockedCache.versions.has(versionId);
}

let integrityCache: Record<string, string> | null = null;
function integrity(): Record<string, string> {
  if (!integrityCache) {
    const f = path.join(DIST_ENGINE, "integrity.json");
    integrityCache = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
  }
  return integrityCache!;
}

async function serveGame(
  gameId: string,
  url: URL,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  o: Origins,
) {
  const base = {
    "Content-Security-Policy": gameCsp(o),
    "Permissions-Policy": PERMISSIONS_POLICY,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  const m = /^\/v\/([a-f0-9]{12})\/(.*)$/.exec(url.pathname);
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(gameId) || !m) return send(res, 404, "not found", base);
  const [, versionId, rest] = m as unknown as [string, string, string];
  if (blocked(gameId, versionId)) return send(res, 410, "this game is no longer available", base);

  const root = path.join(DIST_GAMES, gameId, versionId);
  const rel = rest === "" ? "index.html" : rest;
  const p = safeJoin(root, rel);
  const body = await fileOrNull(p);
  if (!body) return send(res, 404, "not found", base);

  if (rel === "index.html") {
    // Game documents are only served into iframes. A direct visit goes to the game's
    // page in the app, so nobody can send a victim straight to a game URL.
    const dest = req.headers["sec-fetch-dest"];
    if (dest && dest !== "iframe") {
      res.writeHead(302, { Location: `${o.app}/play.html?game=${encodeURIComponent(gameId)}`, ...base });
      return res.end();
    }
    const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8")) as Manifest;
    const html = injectPlatform(body.toString("utf8"), manifest, o, integrity());
    return send(res, 200, html, { ...base, "Content-Type": TYPES[".html"]!, "Cache-Control": "no-cache" });
  }
  send(res, 200, body, {
    ...base,
    "Content-Type": TYPES[path.extname(p!)] ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
}
