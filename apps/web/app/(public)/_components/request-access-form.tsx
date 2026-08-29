"use client";

import { useState } from "react";

type State = { kind: "idle" | "sending" } | { kind: "done" | "error"; message: string };

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

    if (!res) {
      setState({ kind: "error", message: "Network error. Please try again." });
      return;
    }
    const body = await res.json().catch(() => ({}));
    setState(
      res.ok
        ? { kind: "done", message: body.message ?? "Thanks — we'll be in touch." }
        : { kind: "error", message: body.error ?? "Something went wrong." },
    );
  }

  if (state.kind === "done") {
    return (
      <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-6">
        <p className="font-medium">{state.message}</p>
        <p className="mt-2 text-sm text-neutral-600">
          Accounts are approved by hand, so this is not instant.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field name="fullName" label="Full name" required autoComplete="name" />
      <Field name="email" label="Email" type="email" required autoComplete="email" />
      <Field name="firm" label="Firm" />
      <Field name="jurisdiction" label="Where do you practise?" />
      <label className="block">
        <span className="text-sm font-medium">What would you use it for?</span>
        <textarea
          name="useCase"
          rows={3}
          maxLength={2000}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </label>

      {state.kind === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={state.kind === "sending"}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {state.kind === "sending" ? "Sending…" : "Request access"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required && <span aria-hidden className="text-neutral-400"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        maxLength={254}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
    </label>
  );
}
