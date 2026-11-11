/**
 * One live game: the sandboxed iframe, the private MessagePort, and the checks applied
 * to every message the game sends. The game never talks to anything except this object.
 */
import {
  CAPABILITY_FOR,
  GameMessage,
  MAX_MESSAGE_BYTES,
  SDK_VERSION,
  dayKey,
  type ErrorCode,
  type HostMessage,
  type Init,
  type Manifest,
  type Outcome,
} from "@vibe/protocol";
import { dailySeed, perGamePlayerId } from "./identity.ts";
import { RateLimiter } from "./ratelimit.ts";
import { QuotaError, type HostServices } from "./services.ts";

export interface CatalogEntry {
  gameId: string;
  versionId: string;
  url: string;
  manifest: Manifest;
  poster?: string;
}

export type FrameEvent =
  | { type: "loading"; progress: number }
  | { type: "firstFrame"; ms: number }
  | { type: "ready"; ms: number }
  | { type: "start" }
  | { type: "end"; outcome: Outcome; score?: number; runMs: number }
  | { type: "share"; text?: string; score?: number }
  | { type: "scores.show"; board?: string }
  | { type: "track"; name: string; props?: Record<string, string | number | boolean> }
  | { type: "error"; message: string }
  | { type: "violation"; reason: string };

export interface FrameState {
  paused: boolean;
  audio: boolean;
  focused: boolean;
}

export interface FrameOptions {
  entry: CatalogEntry;
  container: HTMLElement;
  services: HostServices;
  /** Secret-ish key the per-game player ID is derived from (device ID for guests). */
  userKey: string;
  guest?: boolean;
  mode: Init["context"]["mode"];
  day?: string;
  challenge?: { score: number; seed: string };
  initial: FrameState;
  onEvent: (e: FrameEvent) => void;
}

export const IFRAME_SANDBOX = "allow-scripts allow-same-origin";
export const IFRAME_ALLOW = "autoplay; fullscreen; gamepad";

export class GameFrame {
  readonly iframe: HTMLIFrameElement;
  readonly origin: string;
  readonly createdAt = performance.now();
  status: "loading" | "connected" | "firstFrame" | "ready" = "loading";
  running = false;
  ended = false;
  violations = 0;

  private port: MessagePort | null = null;
  private playerId: Promise<string>;
  private state: FrameState;
  private limiter = new RateLimiter();
  private runStartedAt = 0;
  private destroyed = false;
  private day: string;

  constructor(private opts: FrameOptions) {
    this.state = { ...opts.initial };
    this.origin = new URL(opts.entry.url).origin;
    this.day = opts.day ?? dayKey();
    this.playerId = perGamePlayerId(opts.userKey, opts.entry.gameId);

    const f = document.createElement("iframe");
    f.setAttribute("sandbox", IFRAME_SANDBOX);
    f.setAttribute("allow", IFRAME_ALLOW);
    f.referrerPolicy = "no-referrer";
    f.loading = "eager";
    f.title = opts.entry.manifest.title;
    f.className = "vibe-game-frame";
    f.style.cssText = "border:0;width:100%;height:100%;display:block;background:transparent";
    window.addEventListener("message", this.onWindowMessage);
    f.src = opts.entry.url;
    opts.container.append(f);
    this.iframe = f;
  }

  get manifest(): Manifest {
    return this.opts.entry.manifest;
  }

  // ---------- Commands from the host UI ----------

  pause() {
    this.set({ paused: true }, { v: 1, type: "pause" });
  }
  resume() {
    this.set({ paused: false }, { v: 1, type: "resume" });
  }
  setAudio(enabled: boolean) {
    this.set({ audio: enabled }, { v: 1, type: "audio", enabled });
  }
  setFocus(focused: boolean) {
    this.set({ focused }, { v: 1, type: "focus", focused });
  }
  restart() {
    this.ended = false;
    this.send({ v: 1, type: "restart" });
  }

  get current(): Readonly<FrameState> {
    return this.state;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener("message", this.onWindowMessage);
    this.port?.close();
    this.port = null;
    // Navigate away first so the engine releases its WebGL context promptly.
    try {
      this.iframe.src = "about:blank";
    } catch {
      /* ignore */
    }
    this.iframe.remove();
  }

  private set(patch: Partial<FrameState>, msg: HostMessage) {
    const changed = Object.entries(patch).some(([k, v]) => this.state[k as keyof FrameState] !== v);
    Object.assign(this.state, patch);
    if (changed) this.send(msg);
  }

  private send(msg: HostMessage) {
    if (this.port && !this.destroyed) this.port.postMessage(msg);
  }

  private violation(reason: string) {
    this.violations++;
    this.opts.onEvent({ type: "violation", reason });
  }

  // ---------- Handshake ----------

  private onWindowMessage = async (e: MessageEvent) => {
    if (e.source !== this.iframe.contentWindow) return;
    if (e.origin !== this.origin) return this.violation(`message from unexpected origin ${e.origin}`);
    const d = e.data as { v?: number; type?: string } | null;
    if (!d || d.v !== 1 || d.type !== "hello") return;
    if (this.port) return; // repeated hellos while the init was in flight
    const channel = new MessageChannel();
    this.port = channel.port1;
    this.port.onmessage = this.onPortMessage;
    const playerId = await this.playerId;
    if (this.destroyed) return;
    const init: Init = {
      contract: 1,
      sdk: SDK_VERSION,
      player: { id: playerId, guest: this.opts.guest ?? true },
      context: {
        mode: this.opts.mode,
        daily: { day: this.day, seed: dailySeed(this.opts.entry.gameId, this.day) },
        challenge: this.opts.challenge,
      },
      state: { ...this.state },
    };
    this.status = "connected";
    this.iframe.contentWindow?.postMessage({ v: 1, type: "init", init } satisfies HostMessage, this.origin, [
      channel.port2,
    ]);
  };

  // ---------- Messages over the port ----------

  private onPortMessage = (e: MessageEvent) => {
    const raw = e.data as { v?: number; type?: unknown; id?: unknown } | null;
    let size: number;
    try {
      size = JSON.stringify(raw)?.length ?? 0;
    } catch {
      return this.violation("unserialisable message");
    }
    if (size > MAX_MESSAGE_BYTES) {
      if (typeof raw?.id === "string") this.respondError(raw.id, "too_large", `message exceeds ${MAX_MESSAGE_BYTES} bytes`);
      return this.violation(`message of ${size} bytes`);
    }
    if (!raw || raw.v !== 1) return this.violation("missing protocol version");
    const parsed = GameMessage.safeParse(raw);
    if (!parsed.success) {
      if (typeof raw.id === "string") this.respondError(raw.id, "invalid", parsed.error.issues[0]?.message ?? "invalid");
      return this.violation(`invalid ${String(raw.type)}: ${parsed.error.issues[0]?.message}`);
    }
    const msg = parsed.data;
    if (!this.limiter.allow(msg.type)) {
      if ("id" in msg) this.respondError(msg.id, "rate_limited", `${msg.type} rate limited`);
      return this.violation(`rate limited ${msg.type}`);
    }
    const cap = CAPABILITY_FOR[msg.type];
    if (cap && !this.manifest.capabilities.includes(cap)) {
      if ("id" in msg) this.respondError(msg.id, "not_declared", `capability "${cap}" not declared in game.json`);
      return this.violation(`undeclared capability ${cap}`);
    }
    void this.handle(msg);
  };

  private async handle(msg: GameMessage) {
    const ev = this.opts.onEvent;
    const now = performance.now();
    switch (msg.type) {
      case "hello":
        return;
      case "loading":
        return ev({ type: "loading", progress: msg.progress });
      case "firstFrame":
        if (this.status === "connected") this.status = "firstFrame";
        return ev({ type: "firstFrame", ms: Math.round(now - this.createdAt) });
      case "ready":
        this.status = "ready";
        return ev({ type: "ready", ms: Math.round(now - this.createdAt) });
      case "start":
        this.running = true;
        this.ended = false;
        this.runStartedAt = now;
        return ev({ type: "start" });
      case "end":
        this.running = false;
        this.ended = true;
        return ev({
          type: "end",
          outcome: msg.outcome,
          score: msg.score,
          runMs: this.runStartedAt ? Math.round(now - this.runStartedAt) : 0,
        });
      case "track":
        return ev({ type: "track", name: msg.name, props: msg.props });
      case "share":
        return ev({ type: "share", text: msg.text, score: msg.score });
      case "scores.show":
        return ev({ type: "scores.show", board: msg.board });
      case "error":
        return ev({ type: "error", message: msg.message });
    }

    // Requests
    const playerId = await this.playerId;
    const gameId = this.opts.entry.gameId;
    const s = this.opts.services;
    try {
      switch (msg.type) {
        case "saves.get":
          return this.respond(msg.id, await s.savesGet(gameId, playerId, msg.key));
        case "saves.set":
          await s.savesSet(gameId, playerId, msg.key, msg.value);
          return this.respond(msg.id, null);
        case "scores.submit": {
          const board = msg.board ?? "default";
          const config = this.manifest.boards?.[board];
          if (!config) return this.respondError(msg.id, "not_declared", `board "${board}" not declared`);
          return this.respond(msg.id, await s.scoresSubmit({ gameId, board, config, playerId, day: this.day }, msg.value));
        }
        case "scores.top": {
          const board = msg.board ?? "default";
          const config = this.manifest.boards?.[board];
          if (!config) return this.respondError(msg.id, "not_declared", `board "${board}" not declared`);
          return this.respond(
            msg.id,
            await s.scoresTop({ gameId, board, config, playerId, day: this.day, limit: msg.limit ?? 10 }),
          );
        }
      }
    } catch (err) {
      const code: ErrorCode = err instanceof QuotaError ? "too_large" : "unavailable";
      this.respondError(msg.id, code, err instanceof Error ? err.message : "failed");
    }
  }

  private respond(id: string, result: unknown) {
    this.send({ v: 1, type: "response", id, ok: true, result });
  }
  private respondError(id: string, code: ErrorCode, message: string) {
    this.send({ v: 1, type: "response", id, ok: false, error: { code, message } });
  }
}
