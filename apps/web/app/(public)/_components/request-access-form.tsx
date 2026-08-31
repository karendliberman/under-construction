"use client";

import { useState } from "react";

type State = { kind: "idle" | "sending" } | { kind: "done" } | { kind: "error"; message: string };

const FIELDS = [
  { name: "fullName", label: "Full name", required: true, autoComplete: "name" },
  { name: "email", label: "Work email", required: true, type: "email", autoComplete: "email" },
  { name: "firm", label: "Firm" },
  { name: "jurisdiction", label: "Where do you practice?" },
] as const;

export function RequestAccessForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "sending" });

    const data = Object.fromEntries(new FormData(event.currentTarget));
    const res = await fetch("/api/access-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => null);

    if (!res) return setState({ kind: "error", message: "Network error. Please try again." });
    if (res.ok) return setState({ kind: "done" });

    const body = await res.json().catch(() => ({}));
    setState({ kind: "error", message: body.error ?? "Something went wrong." });
  }

  if (state.kind === "done") {
    return (
      <div className="uc-rise bg-[var(--apricot-wash)] p-8">
        <h3 className="font-serif text-[32px] leading-tight">Request received.</h3>
        <p className="mt-4 text-[16px] leading-[1.7] text-[var(--text-secondary)]">
          We&apos;ll be in touch with a link to set up your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-6 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="uc-label" htmlFor={f.name}>
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              type={"type" in f ? f.type : "text"}
              required={"required" in f ? f.required : false}
              autoComplete={"autoComplete" in f ? f.autoComplete : undefined}
              maxLength={254}
              className="uc-input"
            />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <label className="uc-label" htmlFor="useCase">
          Which causes of action and courts do you need?
        </label>
        <textarea
          id="useCase"
          name="useCase"
          rows={4}
          maxLength={2000}
          className="uc-input resize-y"
        />
      </div>

      {state.kind === "error" && (
        <p role="alert" className="mt-4 font-mono text-[11.5px] tracking-[0.14em] text-[var(--plum)] uppercase">
          {state.message}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <button type="submit" className="uc-btn" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? "Sending…" : "Send request"}
        </button>
        <span className="font-mono text-[11px] tracking-[0.14em] text-[var(--text-faint)] uppercase">
          We add playbooks by request
        </span>
      </div>
    </form>
  );
}
