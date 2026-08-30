"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";

/**
 * Strength meter per the handoff: 3 segments, <8 one plum bar, 8–11 two
 * apricot, >=12 three blue. Note the API refuses anything under 12, so the
 * first two states are guidance on the way to a password that will be accepted.
 */
function strength(pw: string) {
  if (pw.length === 0) return { bars: 0, label: "", color: "" };
  if (pw.length < 8) return { bars: 1, label: "Too short", color: "var(--plum)" };
  if (pw.length < 12) return { bars: 2, label: "Acceptable", color: "var(--apricot)" };
  return { bars: 3, label: "Strong", color: "var(--blue)" };
}

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const s = strength(pw);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (pw !== String(form.get("confirm"))) {
      setError("The two passwords don't match");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: pw }),
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
          <p className="font-mono text-[11px] tracking-[0.16em] text-[var(--plum)] uppercase">
            Single-use link · expires in 48h
          </p>
          <h1 className="mt-4 font-serif text-[44px] leading-tight tracking-[-0.01em]">
            Set your password
          </h1>

          {!token ? (
            <p className="mt-5 text-[15px] text-[var(--text-secondary)]">
              This page needs the link you were sent. If yours has expired, ask
              for a new one.
            </p>
          ) : (
            <>
              <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
                This link works once.
              </p>

              <form onSubmit={onSubmit} className="mt-9 space-y-5">
                <div>
                  <label className="uc-label" htmlFor="password">New password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="uc-input"
                  />

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex flex-1 gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 flex-1"
                          style={{ background: i < s.bars ? s.color : "#E4DDD4" }}
                        />
                      ))}
                    </div>
                    <span className="w-[86px] font-mono text-[10px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] tracking-[0.12em] text-[var(--text-faint)] uppercase">
                    Minimum 12 characters
                  </p>
                </div>

                <div>
                  <label className="uc-label" htmlFor="confirm">Confirm password</label>
                  <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="uc-input" />
                </div>

                {error && (
                  <p role="alert" className="font-mono text-[11.5px] tracking-[0.14em] text-[var(--plum)] uppercase">
                    {error}
                  </p>
                )}

                <button type="submit" className="uc-btn w-full" disabled={busy}>
                  {busy ? "Saving…" : "Set password and sign in"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
