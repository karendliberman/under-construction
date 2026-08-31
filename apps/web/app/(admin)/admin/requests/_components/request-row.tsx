"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = { sendTo: string; link: string } | { denied: true } | { error: string };

function age(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function RequestRow(props: {
  id: string;
  email: string;
  fullName: string;
  firm: string | null;
  jurisdiction: string | null;
  useCase: string | null;
  createdAt: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function act(action: "approve" | "deny") {
    setBusy(true);
    const res = await fetch(`/api/admin/requests/${props.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return setResult({ error: body.error ?? "Something went wrong." });
    if (action === "deny") {
      setResult({ denied: true });
      router.refresh();
      return;
    }
    setResult({ sendTo: body.sendTo, link: body.link });
  }

  return (
    <li className="border-b border-[var(--hairline)]">
      <div className="grid gap-5 py-6 lg:grid-cols-[1fr_240px_220px]">
        <div>
          <p className="text-[19px] font-semibold">{props.fullName}</p>
          <p className="mt-1 font-mono text-[12px] text-[var(--text-muted)]">{props.email}</p>
          {props.useCase && (
            <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.65] text-[var(--text-secondary)]">
              “{props.useCase}”
            </p>
          )}
        </div>

        <div className="text-[15px]">
          {props.firm && <p className="font-semibold">{props.firm}</p>}
          {props.jurisdiction && (
            <p className="mt-1 text-[var(--text-secondary)]">{props.jurisdiction}</p>
          )}
          <p className="mt-2 font-mono text-[11px] tracking-[0.12em] text-[var(--text-faint)] uppercase">
            {age(props.createdAt)}
          </p>
        </div>

        <div>
          {result === null ? (
            <div className="flex flex-col gap-2.5">
              <button onClick={() => act("approve")} disabled={busy} className="uc-btn">
                Approve
              </button>
              <button onClick={() => act("deny")} disabled={busy} className="uc-btn-ghost">
                Deny
              </button>
            </div>
          ) : "denied" in result ? (
            <span className="inline-block border border-[var(--hairline)] px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
              Denied
            </span>
          ) : "error" in result ? (
            <p role="alert" className="font-mono text-[11px] tracking-[0.14em] text-[var(--plum)] uppercase">
              {result.error}
            </p>
          ) : null}
        </div>
      </div>

      {result && "link" in result && (
        <div className="uc-rise mb-6 border-l-4 border-[var(--blue)] bg-[var(--apricot-wash)] p-6">
          <p className="font-mono text-[11px] tracking-[0.16em] text-[var(--blue)] uppercase">
            Approved. Send this single-use link to {result.sendTo}
          </p>
          <p className="mt-2 font-mono text-[10.5px] tracking-[0.12em] text-[var(--text-muted)] uppercase">
            Valid 48 hours, usable once, shown only now
          </p>
          <code className="mt-4 block border border-[var(--hairline-warm)] bg-[var(--surface)] p-3 font-mono text-[12px] break-all">
            {result.link}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="mt-4 bg-[var(--blue)] px-4 py-2 text-[14px] text-[var(--on-dark)] transition-opacity hover:opacity-90"
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
      )}
    </li>
  );
}
