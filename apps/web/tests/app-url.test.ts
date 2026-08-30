import { describe, it, expect, afterEach } from "vitest";
import { appOrigin } from "@/lib/app-url";

/**
 * These exist because of a real bug: set-password links were built with
 * new URL(request.url).origin, which behind Render's proxy is the container's
 * internal bind address. A user was sent
 * https://0.0.0.0:10000/set-password?token=... and got a blank page.
 */
const req = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers });

afterEach(() => {
  delete process.env.APP_URL;
});

describe("appOrigin", () => {
  it("prefers APP_URL over anything the request says", () => {
    process.env.APP_URL = "https://uc-web.onrender.com";
    const origin = appOrigin(
      req("https://0.0.0.0:10000/api/admin/requests/x", { host: "evil.example.com" }),
    );
    expect(origin).toBe("https://uc-web.onrender.com");
  });

  it("strips a trailing slash from APP_URL", () => {
    process.env.APP_URL = "https://uc-web.onrender.com/";
    expect(appOrigin(req("https://0.0.0.0:10000/x"))).toBe("https://uc-web.onrender.com");
  });

  it("uses the forwarded host when APP_URL is unset", () => {
    const origin = appOrigin(
      req("https://0.0.0.0:10000/api/admin/requests/x", {
        "x-forwarded-host": "uc-web.onrender.com",
        "x-forwarded-proto": "https",
      }),
    );
    expect(origin).toBe("https://uc-web.onrender.com");
  });

  it("takes the first proto when the proxy sends a list", () => {
    const origin = appOrigin(
      req("https://0.0.0.0:10000/x", {
        "x-forwarded-host": "uc-web.onrender.com",
        "x-forwarded-proto": "https, http",
      }),
    );
    expect(origin).toBe("https://uc-web.onrender.com");
  });

  it("falls back to the plain host header", () => {
    const origin = appOrigin(req("http://0.0.0.0:10000/x", { host: "localhost:3000" }));
    expect(origin).toBe("https://localhost:3000");
  });

  it("never returns the container's internal address when proxied", () => {
    const origin = appOrigin(
      req("https://0.0.0.0:10000/x", { "x-forwarded-host": "uc-web.onrender.com" }),
    );
    expect(origin).not.toContain("0.0.0.0");
    expect(origin).not.toContain("10000");
  });
});
