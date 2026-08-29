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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl tracking-tight">Access requests</h1>
      <p className="prose-legal mt-2 text-sm text-muted-foreground">
        Approving creates the account and produces a set-password link. Send it
        to the address shown — sending it there is what makes the link
        meaningful, so don&apos;t send it anywhere else.
      </p>

      {pending.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border p-16 text-center">
          <p className="font-serif text-lg">Nothing pending</p>
          <p className="mt-2 text-sm text-muted-foreground">
            New requests from the public page appear here.
          </p>
        </div>
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
    </main>
  );
}
