/** Device identity for guests, and the per-game player IDs that games see. */

const DEVICE_KEY = "vibe:device";

export function deviceId(storage: Storage = localStorage): string {
  let id = storage.getItem(DEVICE_KEY);
  if (!id) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    id = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    storage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/**
 * HMAC-SHA256(userKey, gameId), truncated. Two games can never link the same person
 * through the ID they receive. In production the key is server-side; here it is the
 * device ID, which is good enough for a guest-only spike.
 */
export async function perGamePlayerId(userKey: string, gameId: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(userKey), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(gameId)));
  return "p_" + [...sig.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function dailySeed(gameId: string, day: string): string {
  return `${gameId}:${day}`;
}
