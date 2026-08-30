"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));

    if (!data.email || !data.password) {
      setError("Email and password are both required");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
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
    <main className="grid min-h-screen lg:grid-cols-[.9fr_1.1fr]">
      <AuthPanel />

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <h1 className="font-serif text-[44px] leading-tight tracking-[-0.01em]">
            Sign in
          </h1>
          <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
            <Link href="/">Request it here</Link> if you don&apos;t have an account.
          </p>

          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            <div>
              <label className="uc-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" className="uc-input" />
            </div>
            <div>
              <label className="uc-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" className="uc-input" />
            </div>

            {error && (
              <p role="alert" className="font-mono text-[11.5px] tracking-[0.14em] text-[var(--plum)] uppercase">
                {error}
              </p>
            )}

            <button type="submit" className="uc-btn w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 font-mono text-[11px] tracking-[0.14em] text-[var(--text-faint)] uppercase">
            Forgot password? Email Karen — no self-serve reset yet.
          </p>
        </div>
      </div>
    </main>
  );
}
