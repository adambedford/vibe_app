/** Token buckets per message type. Games are untrusted; every message type has a budget. */

export interface BucketSpec {
  perSecond: number;
  burst: number;
}

export const DEFAULT_LIMITS: Record<string, BucketSpec> = {
  loading: { perSecond: 30, burst: 60 },
  firstFrame: { perSecond: 5, burst: 10 },
  ready: { perSecond: 5, burst: 10 },
  start: { perSecond: 5, burst: 10 },
  end: { perSecond: 5, burst: 10 },
  track: { perSecond: 10, burst: 30 },
  share: { perSecond: 1, burst: 2 },
  "scores.show": { perSecond: 1, burst: 2 },
  error: { perSecond: 5, burst: 20 },
  "saves.get": { perSecond: 20, burst: 40 },
  "saves.set": { perSecond: 4, burst: 10 },
  "scores.submit": { perSecond: 2, burst: 5 },
  "scores.top": { perSecond: 2, burst: 5 },
};

export class RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();
  constructor(
    private limits: Record<string, BucketSpec> = DEFAULT_LIMITS,
    private now: () => number = () => performance.now(),
  ) {}

  allow(type: string): boolean {
    const spec = this.limits[type] ?? { perSecond: 5, burst: 10 };
    const t = this.now();
    const b = this.buckets.get(type) ?? { tokens: spec.burst, at: t };
    b.tokens = Math.min(spec.burst, b.tokens + ((t - b.at) / 1000) * spec.perSecond);
    b.at = t;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(type, b);
    return ok;
  }
}
