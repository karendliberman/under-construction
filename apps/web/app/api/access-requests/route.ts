import { NextResponse } from "next/server";
import { db, accessRequests } from "@uc/db";
import { accessRequestSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Unauthenticated by design — this is the front door. Two consequences:
 * it is rate-limited by IP, and it never reveals whether an email is already
 * known to us.
 */
export async function POST(request: Request) {
  const limit = rateLimit(`access-request:${clientIp(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "retry-after": String(Math.ceil((limit.retryAfterMs ?? 0) / 1000)) } },
    );
  }

  const parsed = accessRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }

  const { email, fullName, firm, barNumber, jurisdiction, useCase } = parsed.data;

  await db().insert(accessRequests).values({
    email: email.toLowerCase(),
    fullName,
    firm: firm || null,
    barNumber: barNumber || null,
    jurisdiction: jurisdiction || null,
    useCase: useCase || null,
  });

  // Deliberately identical whether or not this email already has an account or
  // a pending request. Don't leak who our users are.
  return NextResponse.json(
    { message: "Thanks — we'll be in touch." },
    { status: 201 },
  );
}
