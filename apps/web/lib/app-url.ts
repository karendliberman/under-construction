import "server-only";

/**
 * The public origin of this app.
 *
 * `new URL(request.url).origin` does NOT work behind a proxy: Render terminates
 * TLS and forwards to the container, so request.url carries the internal bind
 * address and produced links like https://0.0.0.0:10000/set-password?token=...
 * That link is unreachable for the recipient, which is how this was found — a
 * real user got a blank page.
 *
 * Order of preference:
 *   1. APP_URL, set explicitly in render.yaml. Deterministic and not
 *      influenced by anything a client sends.
 *   2. The forwarded host headers, so local dev and preview environments work
 *      without configuration.
 *   3. request.url, which is right only when there is no proxy in front.
 */
export function appOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (host) {
    const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
