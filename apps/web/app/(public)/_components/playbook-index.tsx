import { causesOfAction, jurisdictions } from "@/lib/registry";

/**
 * The handoff's "Live playbook index" card.
 *
 * Driven by the real registry rather than the prototype's sample data. The
 * prototype listed five claims across three courts and a "+34 pairings
 * drafting today" footer; we have what we have, and publishing invented
 * coverage on a marketing page aimed at lawyers is not a good trade.
 */
export function PlaybookIndex() {
  const causes = causesOfAction();
  const courts = new Map(jurisdictions().map((j) => [j.id, j.label]));

  const rows = causes.flatMap((cause) =>
    cause.jurisdictions.map((jid) => ({
      claim: cause.label,
      court: courts.get(jid) ?? jid,
    })),
  );

  return (
    <div className="border border-[var(--blue)] bg-[var(--surface)]">
      <div className="flex items-center justify-between bg-[var(--blue)] px-5 py-3 text-[var(--on-dark)]">
        <span className="font-mono text-[11.5px] tracking-[0.16em] uppercase">
          Playbook index
        </span>
        <span className="uc-pulse size-2 bg-[var(--apricot)]" aria-hidden />
      </div>

      <ul>
        {rows.map((row, i) => (
          <li
            key={`${row.claim}-${row.court}`}
            className="grid grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-[var(--hairline)] px-5 py-3.5 transition-colors hover:bg-[var(--apricot-wash)]"
          >
            <span className="font-mono text-[11.5px] text-[var(--text-faint)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[15px]">{row.claim}</span>
            <span className="font-mono text-[11.5px] tracking-[0.1em] text-[var(--blue)] uppercase">
              {row.court}
            </span>
          </li>
        ))}
      </ul>

      <p className="px-5 py-3.5 font-mono text-[11.5px] tracking-[0.1em] text-[var(--text-muted)] uppercase">
        More pairings in draft
      </p>
    </div>
  );
}
