/**
 * Platform services the host calls on a game's behalf. The spike keeps everything in
 * the app origin's localStorage; the real implementation calls the platform API.
 */
import { MAX_SAVE_BYTES, type BoardConfig, type ScoreEntry, type SubmitResult } from "@vibe/protocol";

export interface ScoreQuery {
  gameId: string;
  board: string;
  config: BoardConfig;
  playerId: string;
  day: string;
  limit: number;
}

export interface HostServices {
  savesGet(gameId: string, playerId: string, key: string): Promise<unknown>;
  savesSet(gameId: string, playerId: string, key: string, value: unknown): Promise<void>;
  scoresSubmit(q: Omit<ScoreQuery, "limit">, value: number): Promise<SubmitResult>;
  scoresTop(q: ScoreQuery): Promise<ScoreEntry[]>;
}

interface StoredScore {
  playerId: string;
  value: number;
  day: string;
  at: number;
}

export class QuotaError extends Error {}

export class LocalServices implements HostServices {
  constructor(private storage: Storage = localStorage) {}

  private saveKey(gameId: string, playerId: string) {
    return `vibe:save:${gameId}:${playerId}`;
  }

  private readSaves(gameId: string, playerId: string): Record<string, unknown> {
    try {
      return JSON.parse(this.storage.getItem(this.saveKey(gameId, playerId)) ?? "{}");
    } catch {
      return {};
    }
  }

  async savesGet(gameId: string, playerId: string, key: string) {
    return this.readSaves(gameId, playerId)[key] ?? null;
  }

  async savesSet(gameId: string, playerId: string, key: string, value: unknown) {
    const all = this.readSaves(gameId, playerId);
    all[key] = value;
    const json = JSON.stringify(all);
    if (json.length > MAX_SAVE_BYTES) throw new QuotaError(`saves exceed ${MAX_SAVE_BYTES} bytes`);
    this.storage.setItem(this.saveKey(gameId, playerId), json);
  }

  private boardKey(gameId: string, board: string, config: BoardConfig, day: string) {
    return `vibe:scores:${gameId}:${board}${config.period === "day" ? `:${day}` : ""}`;
  }

  private readBoard(key: string): StoredScore[] {
    try {
      return JSON.parse(this.storage.getItem(key) ?? "[]");
    } catch {
      return [];
    }
  }

  private better(config: BoardConfig, a: number, b: number) {
    return config.order === "desc" ? a > b : a < b;
  }

  /** One best entry per player, sorted best first. */
  private ranked(entries: StoredScore[], config: BoardConfig): StoredScore[] {
    const best = new Map<string, StoredScore>();
    for (const e of entries) {
      const cur = best.get(e.playerId);
      if (!cur || this.better(config, e.value, cur.value)) best.set(e.playerId, e);
    }
    return [...best.values()].sort((a, b) => (config.order === "desc" ? b.value - a.value : a.value - b.value));
  }

  async scoresSubmit(q: Omit<ScoreQuery, "limit">, value: number): Promise<SubmitResult> {
    const key = this.boardKey(q.gameId, q.board, q.config, q.day);
    const entries = this.readBoard(key);
    const prev = this.ranked(entries, q.config).find((e) => e.playerId === q.playerId);
    entries.push({ playerId: q.playerId, value, day: q.day, at: Date.now() });
    this.storage.setItem(key, JSON.stringify(entries.slice(-500)));
    const ranked = this.ranked(entries, q.config);
    const idx = ranked.findIndex((e) => e.playerId === q.playerId);
    const best = ranked[idx]!.value;
    return { best, rank: idx + 1, improved: !prev || this.better(q.config, value, prev.value) };
  }

  async scoresTop(q: ScoreQuery): Promise<ScoreEntry[]> {
    const ranked = this.ranked(this.readBoard(this.boardKey(q.gameId, q.board, q.config, q.day)), q.config);
    return ranked.slice(0, q.limit).map((e, i) => ({ rank: i + 1, value: e.value, self: e.playerId === q.playerId }));
  }
}
