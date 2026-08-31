"use client";

import { useState } from "react";

type Cause = { id: string; label: string; jurisdictions: string[] };
type Option = { id: string; label: string };

export function Picker({ causes, jurisdictions }: { causes: Cause[]; jurisdictions: Option[] }) {
  const [causeId, setCauseId] = useState("");
  const [courtId, setCourtId] = useState("");

  const cause = causes.find((c) => c.id === causeId);
  const allowed = jurisdictions.filter((j) => cause?.jurisdictions.includes(j.id));
  const court = allowed.find((j) => j.id === courtId);
  const matched = Boolean(cause && court);

  return (
    <div>
      <div className="grid gap-[26px] sm:grid-cols-2">
        <div>
          <label className="uc-label" htmlFor="cause">Cause of action</label>
          <select
            id="cause"
            value={causeId}
            onChange={(e) => {
              const next = causes.find((c) => c.id === e.target.value);
              setCauseId(e.target.value);
              // Reset to this playbook's first court rather than leaving an
              // invalid pairing selected.
              setCourtId(next?.jurisdictions[0] ?? "");
            }}
            className="uc-input border-[var(--chocolate)]"
          >
            <option value="">Select a cause of action…</option>
            {causes.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="uc-label" htmlFor="court">Jurisdiction</label>
          <select
            id="court"
            value={courtId}
            disabled={!cause}
            onChange={(e) => setCourtId(e.target.value)}
            className="uc-input"
          >
            {!cause ? (
              <option value="">Pick a cause of action first</option>
            ) : (
              allowed.map((j) => (
                <option key={j.id} value={j.id}>{j.label}</option>
              ))
            )}
          </select>
        </div>
      </div>

      {matched && (
        <div className="uc-rise mt-8 border-l-[5px] border-[var(--plum)] bg-[var(--apricot-wash)] p-7 sm:p-9">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-[11px] tracking-[0.16em] text-[var(--plum)] uppercase">
              Playbook matched
            </span>
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--text-muted)] uppercase">
              {causeId} · {courtId}
            </span>
          </div>
          <p className="mt-3 font-serif text-[32px] leading-tight">
            {cause!.label} <span className="text-[var(--text-faint)]">·</span> {court!.label}
          </p>
          <p className="mt-5 border-t border-[var(--hairline-warm)] pt-5 text-[14px] leading-[1.7] text-[var(--text-secondary)]">
            The playbook is assembled at drafting time from the shared
            guardrails, the procedural standard, the cause of action, and the
            local practice for this court.
          </p>
        </div>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-5">
        <button className="uc-btn" disabled>
          Continue to facts
        </button>
        <span className="font-mono text-[11px] tracking-[0.14em] text-[var(--text-faint)] uppercase">
          {matched ? "Facts form arrives in Phase 3" : "Pick a pairing with a playbook"}
        </span>
      </div>
    </div>
  );
}
