"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <main className="mx-auto max-w-sm px-6 py-24">
        <h1 className="text-2xl font-semibold">Set your password</h1>
        <p className="mt-4 text-sm text-neutral-600">
          This page needs the link you were sent.
        </p>
      </main>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));

    if (password !== String(form.get("confirm"))) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (res.ok) {
      router.push("/drafts");
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "Something went wrong.");
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Set your password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">New password</span>
          <input
            name="password" type="password" required minLength={12} autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <span className="mt-1 block text-xs text-neutral-500">At least 12 characters.</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Confirm</span>
          <input
            name="confirm" type="password" required minLength={12} autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Set password and sign in"}
        </button>
      </form>
    </main>
  );
}
