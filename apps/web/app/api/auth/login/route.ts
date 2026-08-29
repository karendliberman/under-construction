import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@uc/db";
import { startSession, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const limit = rateLimit(`login:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const [user] = await db()
    .select({ id: users.id, passwordHash: users.passwordHash, status: users.status })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);

  // One message for every failure — wrong password, no such user, never set a
  // password, suspended. Don't turn the login form into an account oracle.
  if (!user || !ok || user.status !== "approved") {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await startSession(user.id);
  return NextResponse.json({ ok: true });
}
