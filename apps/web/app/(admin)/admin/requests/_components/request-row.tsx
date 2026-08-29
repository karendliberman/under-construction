"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Result = { sendTo: string; link: string } | { denied: true } | { error: string };

/**
 * Note on colour: the approval confirmation is neutral, not accent. Oxblood
 * means caution in this palette — it is what the unverified-citations warning
 * uses — and a successful approval is not a warning.
 */
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
    <li>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-serif text-lg">{props.fullName}</p>
              <p className="text-sm text-muted-foreground">{props.email}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(props.createdAt).toLocaleDateString(undefined, {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>

          {(props.firm || props.jurisdiction) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {props.firm && <Badge variant="secondary">{props.firm}</Badge>}
              {props.jurisdiction && <Badge variant="secondary">{props.jurisdiction}</Badge>}
            </div>
          )}
          {props.useCase && (
            <p className="prose-legal mt-4 text-sm whitespace-pre-wrap">{props.useCase}</p>
          )}

          {result && "link" in result ? (
            <div className="mt-5 rounded-md border border-border bg-secondary p-4">
              <p className="text-sm font-medium">
                Approved. Send this link to {result.sendTo}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Valid 48 hours, usable once. Shown only now — approve again to
                issue a fresh one.
              </p>
              <code className="mt-3 block overflow-x-auto rounded border border-border bg-background p-2 text-xs">
                {result.link}
              </code>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  navigator.clipboard.writeText(result.link);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          ) : result && "denied" in result ? (
            <p className="mt-5 text-sm text-muted-foreground">Denied.</p>
          ) : result && "error" in result ? (
            <p role="alert" className="mt-5 text-sm text-destructive">{result.error}</p>
          ) : (
            <div className="mt-5 flex gap-2">
              <Button onClick={() => act("approve")} disabled={busy}>Approve</Button>
              <Button variant="outline" onClick={() => act("deny")} disabled={busy}>Deny</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
