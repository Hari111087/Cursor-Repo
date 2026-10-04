/**
 * Fixed-window in-memory rate limiter. Good enough for a single-user app on one
 * instance; swap for Upstash/Redis when running multiple instances.
 */
type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __rl?: Map<string, Bucket> };
const buckets = (g.__rl ??= new Map());

export function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  b.count++;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}
