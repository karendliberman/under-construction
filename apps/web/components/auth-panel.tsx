import Link from "next/link";

/**
 * The apricot-wash left panel shared by sign-in and set-password.
 * Hidden below lg — the handoff targets wide screens, and stacking a decorative
 * panel above the form on a phone just pushes the form off screen.
 */
export function AuthPanel() {
  return (
    <div className="hidden flex-col justify-between border-r border-[var(--hairline-warm)] bg-[var(--apricot-wash)] p-10 lg:flex">
      <Link href="/" className="flex items-baseline gap-2.5 no-underline">
        <span className="size-[11px] shrink-0 bg-[var(--plum)]" />
        <span className="font-mono text-[13px] tracking-[0.16em] text-[var(--chocolate)] uppercase">
          Under Construction
        </span>
      </Link>

      <div>
        <p className="font-serif text-[58px] leading-[1.02] tracking-[-0.02em] text-balance">
          It writes the motion.
        </p>
        <p className="mt-4 font-mono text-[11.5px] tracking-[0.16em] text-[var(--plum)] uppercase">
          Motions to dismiss · playbook-driven
        </p>
      </div>

      <div className="space-y-1.5 font-mono text-[11px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
        <p>Motions to dismiss · playbook-driven</p>
      </div>
    </div>
  );
}
