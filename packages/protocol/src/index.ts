/**
 * The host–game protocol: the game manifest, the messages a game may send, and the
 * messages the host sends back. The host validates every incoming message against
 * these schemas; the SDK only imports the types, so it stays dependency-free.
 */
import { z } from "zod";

export const CONTRACT_VERSION = 1 as const;
export const SDK_VERSION = "1.0.0" as const;
export const MAX_MESSAGE_BYTES = 64 * 1024;
export const MAX_SAVE_BYTES = 64 * 1024;

/** Engines the platform can serve. Versions are pinned per game and never removed. */
export const SUPPORTED_ENGINES: Record<string, string[]> = {
  phaser: ["4.2.1"],
  none: ["0"],
};

// ---------- Manifest (game.json) ----------

export const BoardName = z.string().regex(/^[a-z0-9-]{1,32}$/);
export const InputKind = z.enum(["tap", "drag-x", "drag-y", "drag", "keys"]);
export const Capability = z.enum(["saves", "scores", "events", "share"]);

export const BoardConfig = z.object({
  order: z.enum(["desc", "asc"]),
  format: z.enum(["points", "duration"]),
  period: z.enum(["all", "day"]),
});

export const Manifest = z.object({
  contract: z.literal(CONTRACT_VERSION),
  sdk: z.literal(SDK_VERSION),
  engine: z.object({ name: z.enum(["phaser", "none"]), version: z.string() }),
  title: z.string().min(1).max(60),
  description: z.string().max(280),
  orientation: z.literal("portrait"),
  input: z.array(InputKind).min(1),
  capabilities: z.array(Capability),
  boards: z.record(BoardName, BoardConfig).optional(),
  audio: z.boolean(),
  daily: z.boolean().optional(),
  template: z.object({ id: z.string(), version: z.string() }),
  remixOf: z.object({ gameId: z.string(), versionId: z.string() }).optional(),
});
export type Manifest = z.infer<typeof Manifest>;
export type BoardConfig = z.infer<typeof BoardConfig>;
export type Capability = z.infer<typeof Capability>;

// ---------- Game -> host ----------

export const Outcome = z.enum(["win", "lose", "complete", "quit"]);
export type Outcome = z.infer<typeof Outcome>;
export const SaveKey = z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/);
export const EventName = z
  .string()
  .regex(/^(level_start|level_end|tutorial_complete|custom\.[a-z0-9_]{1,40})$/);
const RequestId = z.string().min(1).max(32);
const PropValue = z.union([z.string().max(200), z.number(), z.boolean()]);

export const GameMessage = z.discriminatedUnion("type", [
  // Handshake (sent with window.postMessage before the port exists)
  z.object({ type: z.literal("hello"), sdk: z.string(), contract: z.number() }),
  // Lifecycle events
  z.object({ type: z.literal("loading"), progress: z.number().min(0).max(1) }),
  z.object({ type: z.literal("firstFrame") }),
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("end"), outcome: Outcome, score: z.number().optional() }),
  // Other events
  z.object({
    type: z.literal("track"),
    name: EventName,
    props: z.record(z.string().max(40), PropValue).optional(),
  }),
  z.object({
    type: z.literal("share"),
    text: z.string().max(280).optional(),
    score: z.number().optional(),
  }),
  z.object({ type: z.literal("scores.show"), board: BoardName.optional() }),
  z.object({
    type: z.literal("error"),
    message: z.string().max(2000),
    source: z.string().max(500).optional(),
    line: z.number().optional(),
  }),
  // Requests (answered with a response carrying the same id)
  z.object({ type: z.literal("saves.get"), id: RequestId, key: SaveKey }),
  z.object({ type: z.literal("saves.set"), id: RequestId, key: SaveKey, value: z.json() }),
  z.object({
    type: z.literal("scores.submit"),
    id: RequestId,
    value: z.number(),
    board: BoardName.optional(),
  }),
  z.object({
    type: z.literal("scores.top"),
    id: RequestId,
    board: BoardName.optional(),
    scope: z.enum(["global", "friends", "today"]).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
]);
export type GameMessage = z.infer<typeof GameMessage>;
export type GameRequest = Extract<GameMessage, { id: string }>;
export type GameRequestType = GameRequest["type"];

/** Which capability each message type needs. Lifecycle messages need none. */
export const CAPABILITY_FOR: Partial<Record<GameMessage["type"], Capability>> = {
  "saves.get": "saves",
  "saves.set": "saves",
  "scores.submit": "scores",
  "scores.top": "scores",
  "scores.show": "scores",
  track: "events",
  share: "share",
};

// ---------- Host -> game ----------

export interface PlayerInfo {
  /** Stable per (player, game). Never the account ID. */
  id: string;
  guest: boolean;
}

export interface Init {
  contract: typeof CONTRACT_VERSION;
  sdk: string;
  player: PlayerInfo;
  context: {
    mode: "feed" | "focus" | "studio" | "test";
    /** Today's date in the platform's daily timezone (UTC for now), YYYY-MM-DD. */
    daily: { day: string; seed: string };
    challenge?: { score: number; seed: string };
  };
  state: { paused: boolean; audio: boolean; focused: boolean };
}

export type HostMessage =
  | { v: 1; type: "init"; init: Init }
  | { v: 1; type: "pause" }
  | { v: 1; type: "resume" }
  | { v: 1; type: "audio"; enabled: boolean }
  | { v: 1; type: "focus"; focused: boolean }
  | { v: 1; type: "restart" }
  | { v: 1; type: "response"; id: string; ok: true; result: unknown }
  | { v: 1; type: "response"; id: string; ok: false; error: { code: ErrorCode; message: string } };

export type ErrorCode =
  | "invalid"
  | "not_declared"
  | "rate_limited"
  | "too_large"
  | "unavailable"
  | "timeout";

export interface ScoreEntry {
  rank: number;
  value: number;
  /** True for the requesting player's own entry. Names are drawn by the host, not the game. */
  self: boolean;
}

export interface SubmitResult {
  best: number;
  rank?: number;
  improved: boolean;
}

/** Deterministic UTC day key, e.g. "2026-11-11". */
export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
