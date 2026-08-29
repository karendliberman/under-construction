import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, users, setPasswordTokens } from "@uc/db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./session";

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 48; // 48 hours

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string | null) {
  // A user with no password hash has been approved but never set one. Still run
  // a comparison so the response takes the same time either way.
  if (!hash) {
    await bcrypt.compare(plain, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return false;
  }
  return bcrypt.compare(plain, hash);
}

export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Re-reads status so suspension takes effect immediately. */
export async function currentUser() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const [user] = await db()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user && user.status === "approved" ? user : null;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * Returns the raw token exactly once — only its hash is stored. Regenerating
 * is fine and expected: if you lose the link before sending it, issue another.
 */
export async function issueSetPasswordToken(userId: string) {
  const raw = randomBytes(32).toString("base64url");
  await db().insert(setPasswordTokens).values({
    userId,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return raw;
}

/** Single-use: marks the token used and sets the password in one transaction. */
export async function consumeSetPasswordToken(raw: string, newPassword: string) {
  const rows = await db()
    .select({ id: setPasswordTokens.id, userId: setPasswordTokens.userId })
    .from(setPasswordTokens)
    .where(
      and(
        eq(setPasswordTokens.tokenHash, sha256(raw)),
        isNull(setPasswordTokens.usedAt),
        gt(setPasswordTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const token = rows[0];
  if (!token) return null;

  const passwordHash = await hashPassword(newPassword);
  await db().transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, token.userId));
    await tx
      .update(setPasswordTokens)
      .set({ usedAt: new Date() })
      .where(eq(setPasswordTokens.id, token.id));
  });
  return token.userId;
}
