import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

/** 60px sticky chocolate bar, per the handoff's app shell. */
export function AppHeader({
  email,
  role,
  fullName,
}: {
  email: string;
  role: string;
  fullName: string;
}) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between bg-[var(--chocolate)] px-6 text-[var(--on-dark)] sm:px-8">
      <div className="flex items-center gap-6 sm:gap-9">
        {/* The handoff points the logo at /drafts; going to the marketing page
            is the more conventional behaviour and the Drafts nav link is right
            beside it, so nothing is lost. */}
        <Link href="/" className="flex items-baseline gap-2.5 no-underline">
          <span className="size-2.5 shrink-0 bg-[var(--apricot)]" />
          <span className="hidden font-mono text-[12px] tracking-[0.16em] uppercase sm:inline">
            Under Construction
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-[14px]">
          <Link href="/drafts" className="no-underline hover:text-[var(--apricot)]">
            Drafts
          </Link>
          {role === "admin" && (
            <Link href="/admin/requests" className="no-underline hover:text-[var(--apricot)]">
              Access requests
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/drafts/new"
          className="bg-[var(--apricot)] px-4 py-2 text-[14px] font-medium text-[var(--chocolate)] no-underline transition-colors hover:bg-white"
        >
          New draft
        </Link>
        <span
          title={email}
          className="grid size-[30px] place-items-center bg-[var(--plum)] font-mono text-[11px] text-[var(--on-plum)]"
        >
          {initials || "—"}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
