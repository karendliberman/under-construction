/**
 * Fixed-window rate limit, in memory.
 *
 * Deliberately the cheapest thing that works: V0 runs a single web instance, so
 * a Map is enough. It resets on deploy and does not coordinate across
 * instances — when either of those matters (more than one instance, or an
 * attacker worth caring about), this moves to Postgres or Upstash. It is a
 * speed bump on a public form, not a security control.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count };
}

/** Render sits behind a proxy, so the socket address is the proxy's. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
