import { describe, it, expect } from "vitest";
import { rateLimit, clientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit then refuses", () => {
    const key = `k-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
  });

  it("reports how long until the window resets", () => {
    const key = `k-${Math.random()}`;
    rateLimit(key, 1, 60_000);
    const refused = rateLimit(key, 1, 60_000);
    expect(refused.ok).toBe(false);
    expect(refused.retryAfterMs).toBeGreaterThan(0);
    expect(refused.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("keeps buckets separate per key, so one IP cannot lock out another", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("starts a fresh window once the old one has passed", () => {
    const key = `k-${Math.random()}`;
    expect(rateLimit(key, 1, 1).ok).toBe(true);
    // Window of 1ms: by the next tick it has expired.
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(rateLimit(key, 1, 1).ok).toBe(true);
        resolve();
      }, 5),
    );
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://example.com", { headers });

  it("takes the first entry of x-forwarded-for", () => {
    // Render sits behind a proxy, so the socket address is the proxy's. The
    // left-most entry is the original client.
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("trims whitespace", () => {
    expect(clientIp(req({ "x-forwarded-for": "  203.0.113.7  , 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a constant", () => {
    expect(clientIp(req({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
