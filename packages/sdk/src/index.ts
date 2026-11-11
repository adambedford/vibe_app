/**
 * Vibe SDK v1. Built as a standalone script, served from the engine CDN at
 * /sdk/<version>/vibe.js and injected into every game by the edge. It defines `window.vibe`.
 *
 * Transport: one `hello` via window.postMessage, then everything over a private
 * MessagePort that the host transfers in its `init` reply.
 */
import type { HostMessage, Init } from "@vibe/protocol";
import type { EndResult, Json, Vibe } from "./types.ts";

const VERSION = "1.0.0";
const REQUEST_TIMEOUT_MS = 10_000;

type Listener<T extends unknown[]> = (...args: T) => void;

export function createVibe(win: Window & typeof globalThis): Vibe {
  let port: MessagePort | null = null;
  let init: Init | null = null;
  let seq = 0;
  let errorsSent = 0;
  const outbox: object[] = [];
  const pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  const state = { paused: false, audio: false, focused: false };
  const listeners = {
    pause: [] as Listener<[]>[],
    resume: [] as Listener<[]>[],
    audio: [] as Listener<[boolean]>[],
    focus: [] as Listener<[boolean]>[],
    restart: [] as Listener<[]>[],
  };

  let resolveConnect!: (i: Init) => void;
  const connected = new Promise<Init>((r) => (resolveConnect = r));

  function post(msg: object) {
    const m = { v: 1, ...msg };
    if (port) port.postMessage(m);
    else outbox.push(m);
  }

  function request<T>(type: string, body: object): Promise<T> {
    const id = `r${++seq}`;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`vibe: ${type} timed out`));
      }, REQUEST_TIMEOUT_MS);
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      post({ type, id, ...body });
    });
  }

  function emit<K extends keyof typeof listeners>(kind: K, ...args: Parameters<(typeof listeners)[K][number]>) {
    for (const cb of listeners[kind]) {
      try {
        (cb as (...a: unknown[]) => void)(...args);
      } catch (e) {
        reportError(e);
      }
    }
  }

  function onHostMessage(e: MessageEvent<HostMessage>) {
    const m = e.data;
    if (!m || m.v !== 1) return;
    switch (m.type) {
      case "pause":
        if (!state.paused) {
          state.paused = true;
          emit("pause");
        }
        break;
      case "resume":
        if (state.paused) {
          state.paused = false;
          emit("resume");
        }
        break;
      case "audio":
        state.audio = m.enabled;
        emit("audio", m.enabled);
        break;
      case "focus":
        state.focused = m.focused;
        emit("focus", m.focused);
        break;
      case "restart":
        emit("restart");
        break;
      case "response": {
        const p = pending.get(m.id);
        if (!p) return;
        pending.delete(m.id);
        clearTimeout(p.timer);
        if (m.ok) p.resolve(m.result);
        else p.reject(Object.assign(new Error(m.error.message), { code: m.error.code }));
        break;
      }
    }
  }

  function connectWith(i: Init, p: MessagePort | null) {
    init = i;
    Object.assign(state, i.state);
    if (p) {
      port = p;
      port.onmessage = onHostMessage;
      for (const m of outbox.splice(0)) port.postMessage(m);
    }
    resolveConnect(i);
    emit("audio", state.audio);
  }

  // Handshake. Retry hello until the host answers (it may attach late).
  const inFrame = win.parent && win.parent !== win;
  if (inFrame) {
    win.addEventListener("message", (e: MessageEvent) => {
      if (e.source !== win.parent || port) return;
      const d = e.data as HostMessage | undefined;
      if (!d || d.v !== 1 || d.type !== "init" || !e.ports[0]) return;
      connectWith(d.init, e.ports[0]);
    });
    let tries = 0;
    const hello = () => {
      if (port || tries++ > 20) return;
      win.parent.postMessage({ v: 1, type: "hello", sdk: VERSION, contract: 1 }, "*");
      setTimeout(hello, 250);
    };
    hello();
  } else {
    // Opened outside a host (local development only; the edge refuses top-level loads).
    queueMicrotask(() =>
      connectWith(
        {
          contract: 1,
          sdk: VERSION,
          player: { id: "standalone", guest: true },
          context: { mode: "studio", daily: { day: new Date().toISOString().slice(0, 10), seed: "standalone" } },
          state: { paused: false, audio: true, focused: true },
        },
        null,
      ),
    );
  }

  function reportError(e: unknown, source?: string, line?: number) {
    if (errorsSent++ >= 20) return;
    const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    post({ type: "error", message: message.slice(0, 2000), source: source?.slice(0, 500), line });
  }
  win.addEventListener("error", (ev) => reportError(ev.error ?? ev.message, ev.filename, ev.lineno));
  win.addEventListener("unhandledrejection", (ev) => reportError(ev.reason));

  function requireInit(): Init {
    if (!init) throw new Error("vibe: call `await vibe.connect()` first");
    return init;
  }

  const api: Vibe = {
    version: VERSION,
    connect: () => connected,
    loading: (progress) => post({ type: "loading", progress: Math.max(0, Math.min(1, progress)) }),
    firstFrame: () => post({ type: "firstFrame" }),
    ready: () => post({ type: "ready" }),
    start: () => post({ type: "start" }),
    end: (result: EndResult) => post({ type: "end", outcome: result.outcome, score: result.score }),
    onPause: (cb) => void listeners.pause.push(cb),
    onResume: (cb) => void listeners.resume.push(cb),
    onAudio: (cb) => {
      listeners.audio.push(cb);
      if (init) cb(state.audio);
    },
    onFocus: (cb) => void listeners.focus.push(cb),
    onRestart: (cb) => void listeners.restart.push(cb),
    get paused() {
      return state.paused;
    },
    get audioEnabled() {
      return state.audio;
    },
    get focused() {
      return state.focused;
    },
    get player() {
      return requireInit().player;
    },
    get context() {
      return requireInit().context;
    },
    saves: {
      get: <T extends Json = Json>(key: string) => request<T | null>("saves.get", { key }),
      set: (key: string, value: Json) => request<void>("saves.set", { key, value }),
    },
    scores: {
      submit: (value, opts) => request("scores.submit", { value, board: opts?.board }),
      top: (opts) => request("scores.top", { ...opts }),
      show: (opts) => post({ type: "scores.show", board: opts?.board }),
    },
    events: {
      track: (name, props) => post({ type: "track", name, props }),
    },
    share: (opts) => post({ type: "share", text: opts?.text, score: opts?.score }),
    random: (seed: string) => mulberry32(hashSeed(seed)),
    newSeed: () => {
      const challenge = init?.context.challenge;
      if (challenge) return challenge.seed;
      const a = new Uint32Array(2);
      win.crypto.getRandomValues(a);
      return a[0]!.toString(36) + a[1]!.toString(36);
    },
  };
  return api;
}

/** 32-bit FNV-1a hash of a string. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// When loaded as a script in a game page, install the global.
if (typeof window !== "undefined" && !(window as { vibe?: Vibe }).vibe) {
  (window as unknown as { vibe: Vibe }).vibe = createVibe(window as Window & typeof globalThis);
}
