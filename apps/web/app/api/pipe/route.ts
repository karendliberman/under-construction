import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db, pipeChecks } from "@uc/db";

/**
 * PHASE 0.6 ONLY — "prove the pipe".
 *
 * POST writes a queued row. The worker claims it and writes back a reply.
 * GET shows what came back. Delete this route once the real generations
 * endpoint exists (implementation guide §5).
 *
 * Note there is no auth here because Phase 1 hasn't happened yet. That is
 * exactly why this route does not survive into a build anyone can reach.
 */
export const dynamic = "force-dynamic";

const Body = z.object({ note: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const [row] = await db()
    .insert(pipeChecks)
    .values({ note: parsed.data.note })
    .returning({ id: pipeChecks.id, status: pipeChecks.status });

  // The web service's job ends here. No call to the worker — the row IS the
  // message (invariant 1).
  return NextResponse.json(row, { status: 202 });
}

export async function GET() {
  const rows = await db()
    .select()
    .from(pipeChecks)
    .orderBy(desc(pipeChecks.createdAt))
    .limit(20);

  return NextResponse.json(rows);
}
