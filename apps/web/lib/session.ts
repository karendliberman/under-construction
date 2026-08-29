import { SignJWT, jwtVerify } from "jose";

/**
 * Session as a signed JWT in a cookie. No sessions table: the only thing the
 * cookie asserts is "this user authenticated", and whether they are still
 * ALLOWED in is a separate question answered from the database on every
 * request. See middleware.ts.
 *
 * `jose` is used rather than a Node crypto library because this has to verify
 * in middleware, which may run on the Edge runtime.
 */
export const SESSION_COOKIE = "uc_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // two weeks, not forever

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<{ userId: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null; // expired, tampered with, or signed by a rotated secret
  }
}
