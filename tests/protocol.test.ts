import { describe, expect, it } from "vitest";
import { GameMessage, Manifest } from "@vibe/protocol";
import { RateLimiter } from "@vibe/host";
import { readFileSync, readdirSync } from "node:fs";

describe("protocol", () => {
  it("accepts well-formed messages", () => {
    for (const m of [
      { type: "ready" },
      { type: "end", outcome: "lose", score: 12 },
      { type: "saves.set", id: "r1", key: "best", value: { a: [1, 2, "x"] } },
      { type: "scores.top", id: "r2", scope: "today", limit: 5 },
      { type: "track", name: "custom.coin_collected", props: { n: 3 } },
    ]) {
      expect(GameMessage.safeParse(m).success, JSON.stringify(m)).toBe(true);
    }
  });

  it("rejects unknown types, bad names and oversized fields", () => {
    for (const m of [
      { type: "eval", code: "alert(1)" },
      { type: "track", name: "purchase" },
      { type: "saves.get", id: "r1", key: "../etc" },
      { type: "share", text: "x".repeat(400) },
      { type: "scores.top", id: "r3", limit: 1000 },
      { type: "end", outcome: "victory" },
    ]) {
      expect(GameMessage.safeParse(m).success, JSON.stringify(m)).toBe(false);
    }
  });

  it("every template manifest is valid", () => {
    for (const t of readdirSync("templates")) {
      const m = JSON.parse(readFileSync(`templates/${t}/game.json`, "utf8"));
      expect(Manifest.safeParse(m).success, t).toBe(true);
    }
  });
});

describe("host rate limiter", () => {
  it("allows a burst, then refills over time", () => {
    let now = 0;
    const rl = new RateLimiter({ x: { perSecond: 2, burst: 3 } }, () => now);
    expect([rl.allow("x"), rl.allow("x"), rl.allow("x"), rl.allow("x")]).toEqual([true, true, true, false]);
    now += 500;
    expect(rl.allow("x")).toBe(true);
    expect(rl.allow("x")).toBe(false);
  });
});
