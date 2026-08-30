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
    <main className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 sm:px-8 sm:pt-[52px]">
      <p className="font-mono text-[11px] tracking-[0.16em] text-[var(--plum)] uppercase">
        Admin
      </p>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-[clamp(2.25rem,6vw,52px)] leading-tight tracking-[-0.01em]">
          Access requests
        </h1>
        <span className="font-mono text-[11.5px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
          {pending.length} pending
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="mt-12 border border-dashed border-[#CBBFB4] bg-[var(--surface)] px-6 py-20 text-center">
          <h2 className="font-serif text-[32px] leading-tight">Nothing pending</h2>
          <p className="mt-3 text-[16px] text-[var(--text-secondary)]">
            New requests from the public page appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-10 border-t border-[var(--chocolate)]">
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
