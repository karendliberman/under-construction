import Link from "next/link";

/** Chocolate bar used logged-out. 15px/40px per the handoff. */
export function TopBar() {
  return (
    <div className="flex items-center justify-between bg-[var(--chocolate)] px-6 py-[15px] text-[var(--on-dark)] sm:px-10">
      <Link href="/" className="flex items-baseline gap-2.5 no-underline">
        <span className="size-[11px] shrink-0 bg-[var(--apricot)]" />
        <span className="font-mono text-[13px] tracking-[0.16em] uppercase">
          Under Construction
        </span>
      </Link>
      <div className="flex items-center gap-4 sm:gap-[26px]">
        <span className="hidden font-mono text-[11.5px] tracking-[0.14em] text-[rgba(246,243,238,.55)] uppercase sm:inline">
          Motions to dismiss
        </span>
        <Link
          href="/login"
          className="border border-[rgba(246,243,238,.35)] px-[18px] py-2 text-sm no-underline transition-all duration-200 hover:border-[var(--apricot)] hover:bg-[var(--apricot)] hover:text-[var(--chocolate)]"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
