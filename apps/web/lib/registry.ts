import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/**
 * INVARIANT 2: this module reads playbooks/registry.yaml and NOTHING else from
 * that directory. Labels and filenames only — playbook prose must never reach
 * the web service, and the web image does not even contain it.
 *
 * If you find yourself wanting to read a .md file here, the answer is that the
 * worker does that. See services/agent/agent/playbooks.py.
 */

type Registry = {
  shared: string[];
  causes_of_action: Record<
    string,
    { label: string; procedural: string; substantive: string; jurisdictions: string[] }
  >;
  jurisdictions: Record<string, { label: string; file: string }>;
};

export type Option = { id: string; label: string };

function registryPath(): string {
  // Works from `next dev` (cwd = apps/web) and from the image (cwd = /app).
  const candidates = [
    join(process.cwd(), "playbooks", "registry.yaml"),
    join(process.cwd(), "..", "..", "playbooks", "registry.yaml"),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      /* try the next one */
    }
  }
  throw new Error("playbooks/registry.yaml not found");
}

let cached: Registry | undefined;

function registry(): Registry {
  if (!cached) cached = parse(readFileSync(registryPath(), "utf8")) as Registry;
  return cached;
}

/** Causes of action that have at least one jurisdiction, sorted by label. */
export function causesOfAction(): (Option & { jurisdictions: string[] })[] {
  const { causes_of_action } = registry();
  return Object.entries(causes_of_action)
    .filter(([, spec]) => spec.jurisdictions.length > 0)
    .map(([id, spec]) => ({ id, label: spec.label, jurisdictions: spec.jurisdictions }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function jurisdictions(): Option[] {
  const { jurisdictions: j } = registry();
  return Object.entries(j)
    .map(([id, spec]) => ({ id, label: spec.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The web app's other job: refuse a combination the registry does not declare,
 * before a row is ever written. The worker would reject it too, but failing at
 * submit time is a better experience than failing three minutes into a job.
 */
export function combinationExists(causeOfAction: string, jurisdiction: string): boolean {
  const spec = registry().causes_of_action[causeOfAction];
  return Boolean(spec?.jurisdictions.includes(jurisdiction));
}
