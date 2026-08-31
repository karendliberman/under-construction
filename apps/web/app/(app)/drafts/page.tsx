import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DraftsPage() {
  // Generation lands in Phase 3, so every user is in the empty state today.
  const drafts: { id: string; title: string; claim: string; court: string; status: string }[] = [];

  return (
    <main className="mx-auto max-w-[1180px] px-6 pt-12 pb-20 sm:px-8 sm:pt-[52px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-[clamp(2.25rem,6vw,52px)] leading-tight tracking-[-0.01em]">
          Drafts
        </h1>
        <span className="font-mono text-[11.5px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
          {drafts.length === 0
            ? "No drafts yet"
            : `${drafts.length} drafts · most recent first`}
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="mt-12 border border-dashed border-[#CBBFB4] bg-[var(--surface)] px-6 py-20 text-center">
          <span className="mx-auto grid size-[54px] place-items-center border border-[var(--plum)] font-serif text-[26px] text-[var(--plum)]">
            §
          </span>
          <h2 className="mt-7 font-serif text-[32px] leading-tight">No drafts yet</h2>
          <p className="mx-auto mt-3 max-w-[440px] text-[16px] leading-[1.7] text-[var(--text-secondary)] text-pretty">
            Pick a cause of action and a court, upload the complaint, and you
            have a complete motion in a few minutes.
          </p>
          <Link href="/drafts/new" className="uc-btn mt-8 no-underline">
            Draft your first motion
          </Link>
        </div>
      ) : null}
    </main>
  );
}
