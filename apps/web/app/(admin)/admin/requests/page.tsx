import { desc, eq } from "drizzle-orm";
import { db, accessRequests } from "@uc/db";
import { RequestRow } from "./_components/request-row";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  const pending = await db()
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"))
    .orderBy(desc(accessRequests.createdAt));

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Access requests</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Approving creates the account and produces a set-password link. Send it
        to the address shown — that address is what makes the link meaningful.
      </p>

      {pending.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
          Nothing pending.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {pending.map((r) => (
            <RequestRow
              key={r.id}
              id={r.id}
              email={r.email}
              fullName={r.fullName}
              firm={r.firm}
              jurisdiction={r.jurisdiction}
              useCase={r.useCase}
              createdAt={r.createdAt.toISOString()}
            />
          ))}
        </ul>
      )}

      <p className="mt-10 text-sm">
        <a href="/drafts" className="underline underline-offset-4">Back to drafts</a>
      </p>
    </main>
  );
}
