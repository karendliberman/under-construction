import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeSetPasswordToken, startSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(1).max(200),
  // Length is the only rule that reliably helps. Composition rules push people
  // towards Password1! and no further.
  password: z.string().min(12, "Use at least 12 characters").max(200),
});

export async function POST(request: Request) {
  const limit = rateLimit(`set-password:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }

  const userId = await consumeSetPasswordToken(parsed.data.token, parsed.data.password);
  if (!userId) {
    return NextResponse.json({ error: "That link is invalid or has expired." }, { status: 400 });
  }

  // Log them straight in — they just proved they hold the link.
  await startSession(userId);
  return NextResponse.json({ ok: true });
}
