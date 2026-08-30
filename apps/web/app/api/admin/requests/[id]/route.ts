import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, accessRequests, users } from "@uc/db";
import { currentUser, issueSetPasswordToken } from "@/lib/auth";
import { appOrigin } from "@/lib/app-url";

export const dynamic = "force-dynamic";

const schema = z.object({ action: z.enum(["approve", "deny"]) });

/**
 * NOTE: middleware.ts does not match /api/admin/*, so this route checks
 * admin-ness itself. Two places that must agree is a bug waiting to happen —
 * when the matcher grows, revisit.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await currentUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { id } = await params;

  const [req] = await db()
    .select()
    .from(accessRequests)
    .where(and(eq(accessRequests.id, id), eq(accessRequests.status, "pending")))
    .limit(1);

  if (!req) {
    return NextResponse.json({ error: "No such pending request" }, { status: 404 });
  }

  if (parsed.data.action === "deny") {
    await db()
      .update(accessRequests)
      .set({ status: "denied", reviewedBy: admin.id, reviewedAt: new Date() })
      .where(eq(accessRequests.id, id));
    return NextResponse.json({ ok: true, action: "denied" });
  }

  // Approve: create the user and mark the request, atomically. A user with a
  // half-approved request is worse than a failed click.
  const email = req.email.toLowerCase();
  const [existing] = await db().select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  const userId = await db().transaction(async (tx) => {
    let id_ = existing?.id;
    if (!id_) {
      const [created] = await tx
        .insert(users)
        .values({ email, fullName: req.fullName, firm: req.firm, role: "member", status: "approved" })
        .returning({ id: users.id });
      id_ = created!.id;
    }
    await tx
      .update(accessRequests)
      .set({ status: "approved", reviewedBy: admin.id, reviewedAt: new Date() })
      .where(eq(accessRequests.id, id));
    return id_;
  });

  // Returned once, for you to send to the address below. Only its hash is stored.
  const token = await issueSetPasswordToken(userId);
  const origin = appOrigin(request);

  return NextResponse.json({
    ok: true,
    action: "approved",
    sendTo: email,
    link: `${origin}/set-password?token=${token}`,
  });
}
