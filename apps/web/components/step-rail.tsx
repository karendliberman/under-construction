const STEPS = ["01 Combination", "02 Facts", "03 Draft"] as const;

export function StepRail({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-[0.16em] uppercase">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-3">
          <span
            className={
              i + 1 === current ? "text-[var(--plum)]" : "text-[var(--text-faint)]"
            }
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <span className="text-[var(--text-faint)]" aria-hidden>·</span>
          )}
        </li>
      ))}
    </ol>
  );
}
