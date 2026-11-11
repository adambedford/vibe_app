/**
 * Per-device session state shared by the feed and the play page: identity, services,
 * mute, and the host-measured analytics log (trusted signals; see design doc 04 §5).
 */
import { LocalServices, deviceId } from "@vibe/host";
import type { BoardConfig } from "@vibe/protocol";

export const services = new LocalServices();
export const userKey = deviceId();

const MUTE_KEY = "vibe:muted";
export const prefs = {
  get muted() {
    return localStorage.getItem(MUTE_KEY) !== "0";
  },
  set muted(v: boolean) {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  },
};

export interface LogEvent {
  t: number;
  type: string;
  gameId?: string;
  versionId?: string;
  [k: string]: unknown;
}

const log: LogEvent[] = [];
(window as unknown as { __vibeLog: LogEvent[] }).__vibeLog = log;

export function track(type: string, props: Omit<LogEvent, "t" | "type"> = {}) {
  const e: LogEvent = { t: Math.round(performance.now()), type, ...props };
  log.push(e);
  if (log.length > 2000) log.splice(0, 500);
  if (new URLSearchParams(location.search).has("debug")) console.debug("[vibe]", type, props);
}

export function formatScore(value: number | undefined, board?: BoardConfig): string {
  if (value === undefined) return "";
  if (board?.format === "duration") {
    const s = Math.floor(value / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  return String(value);
}

export function toast(text: string) {
  let el = document.querySelector<HTMLDivElement>(".host-toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "host-toast";
    document.body.append(el);
  }
  el.textContent = text;
  el.classList.add("show");
  clearTimeout((el as unknown as { _t?: number })._t);
  (el as unknown as { _t?: number })._t = window.setTimeout(() => el!.classList.remove("show"), 2000);
}

export async function shareLink(title: string, text: string, url: string) {
  track("share", { url });
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
  } catch {
    /* user cancelled, or share unavailable: fall through to copy */
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast("Link copied");
  } catch {
    toast(url);
  }
}
