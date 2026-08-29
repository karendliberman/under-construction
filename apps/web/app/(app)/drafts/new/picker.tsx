"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type Cause = { id: string; label: string; jurisdictions: string[] };
type Option = { id: string; label: string };

const selectClass =
  "mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function Picker({ causes, jurisdictions }: { causes: Cause[]; jurisdictions: Option[] }) {
  const [causeId, setCauseId] = useState(causes[0]?.id ?? "");
  const cause = causes.find((c) => c.id === causeId);

  // Only jurisdictions this cause of action actually has a playbook for.
  const allowed = jurisdictions.filter((j) => cause?.jurisdictions.includes(j.id));
  const [jurisdictionId, setJurisdictionId] = useState(allowed[0]?.id ?? "");
  const jurisdiction = allowed.find((j) => j.id === jurisdictionId);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="cause">Cause of action</Label>
          <select
            id="cause"
            value={causeId}
            onChange={(e) => {
              const next = causes.find((c) => c.id === e.target.value);
              setCauseId(e.target.value);
              setJurisdictionId(next?.jurisdictions[0] ?? "");
            }}
            className={selectClass}
          >
            {causes.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="jurisdiction">Jurisdiction</Label>
          <select
            id="jurisdiction"
            value={jurisdictionId}
            onChange={(e) => setJurisdictionId(e.target.value)}
            className={selectClass}
          >
            {allowed.map((j) => (
              <option key={j.id} value={j.id}>{j.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Only jurisdictions with a playbook for this cause of action.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Playbook selected</p>
          <p className="mt-1 font-serif text-xl">
            {cause?.label} <span className="text-muted-foreground">/</span> {jurisdiction?.label}
          </p>
          <Button disabled className="mt-5">
            Continue to case facts
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            The case-facts form and generation arrive in Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
