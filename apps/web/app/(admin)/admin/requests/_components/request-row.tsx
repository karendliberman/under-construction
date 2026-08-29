"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = { sendTo: string; link: string } | { denied: true } | { error: string };

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

    if (!res.ok) {
      setResult({ error: body.error ?? "Something went wrong." });
      return;
    }
    if (action === "deny") {
      setResult({ denied: true });
      router.refresh();
      return;
    }
    // Shown once. The token's hash is stored, not the token, so this exact
    // string cannot be recovered — but a fresh link can always be issued.
    setResult({ sendTo: body.sendTo, link: body.link });
  }

  return (
    <li className="rounded-lg border border-neutral-300 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium">{props.fullName}</p>
          <p className="text-sm text-neutral-600">{props.email}</p>
        </div>
        <p className="text-xs text-neutral-500">
          {new Date(props.createdAt).toLocaleString()}
        </p>
      </div>

      {(props.firm || props.jurisdiction) && (
        <p className="mt-2 text-sm text-neutral-600">
          {[props.firm, props.jurisdiction].filter(Boolean).join(" · ")}
        </p>
      )}
      {props.useCase && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{props.useCase}</p>
      )}

      {result && "link" in result ? (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">
            Approved. Send this link to {result.sendTo}
          </p>
          <p className="mt-1 text-xs text-green-800">
            Valid for 48 hours, usable once. It is shown only now — but you can
            approve again to issue a fresh one.
          </p>
          <code className="mt-3 block overflow-x-auto rounded border border-green-200 bg-white p-2 text-xs">
            {result.link}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.link);
              setCopied(true);
            }}
            className="mt-3 rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : result && "denied" in result ? (
        <p className="mt-4 text-sm text-neutral-600">Denied.</p>
      ) : result && "error" in result ? (
        <p role="alert" className="mt-4 text-sm text-red-700">{result.error}</p>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => act("approve")} disabled={busy}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => act("deny")} disabled={busy}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      )}
    </li>
  );
}
