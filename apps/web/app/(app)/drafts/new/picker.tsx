"use client";

import { useState } from "react";

type Cause = { id: string; label: string; jurisdictions: string[] };
type Option = { id: string; label: string };

export function Picker({ causes, jurisdictions }: { causes: Cause[]; jurisdictions: Option[] }) {
  const [causeId, setCauseId] = useState(causes[0]?.id ?? "");
  const cause = causes.find((c) => c.id === causeId);

  // Only jurisdictions this cause of action actually has a playbook for.
  const allowed = jurisdictions.filter((j) => cause?.jurisdictions.includes(j.id));
  const [jurisdictionId, setJurisdictionId] = useState(allowed[0]?.id ?? "");

  const valid = Boolean(cause?.jurisdictions.includes(jurisdictionId));

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Cause of action</span>
        <select
          value={causeId}
          onChange={(e) => {
            const next = causes.find((c) => c.id === e.target.value);
            setCauseId(e.target.value);
            setJurisdictionId(next?.jurisdictions[0] ?? "");
          }}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {causes.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Jurisdiction</span>
        <select
          value={jurisdictionId}
          onChange={(e) => setJurisdictionId(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {allowed.map((j) => (
            <option key={j.id} value={j.id}>{j.label}</option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-neutral-500">
          Only jurisdictions with a playbook for this cause of action are listed.
        </span>
      </label>

      <div className="rounded-md border border-dashed border-neutral-300 p-6">
        <p className="text-sm text-neutral-600">
          Selected:{" "}
          <span className="font-medium text-neutral-900">
            {cause?.label} / {allowed.find((j) => j.id === jurisdictionId)?.label}
          </span>
        </p>
        <button
          disabled
          className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Draft motion to dismiss
        </button>
        <p className="mt-2 text-xs text-neutral-500">
          The case-facts form and generation arrive in Phase 3.
          {!valid && " (No playbook for this combination.)"}
        </p>
      </div>
    </div>
  );
}
