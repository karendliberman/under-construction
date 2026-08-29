import "server-only";

/**
 * INVARIANT 2: the web service knows about playbook labels and filenames, and
 * nothing else. It does not read the playbooks directory — next.config.mjs
 * bakes registry.yaml in at build time, so there is no runtime path here that
 * could be pointed at a .md file even by accident.
 *
 * If you find yourself wanting playbook prose here, the answer is that the
 * worker composes it. See services/agent/agent/playbooks.py.
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

let cached: Registry | undefined;

function registry(): Registry {
  if (!cached) {
    const raw = process.env.UC_PLAYBOOK_REGISTRY;
    if (!raw) throw new Error("UC_PLAYBOOK_REGISTRY missing — check next.config.mjs");
    cached = JSON.parse(raw) as Registry;
  }
  return cached;
}

/** Causes of action that have at least one jurisdiction, sorted by label. */
export function causesOfAction(): (Option & { jurisdictions: string[] })[] {
  return Object.entries(registry().causes_of_action)
    .filter(([, spec]) => spec.jurisdictions.length > 0)
    .map(([id, spec]) => ({ id, label: spec.label, jurisdictions: spec.jurisdictions }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function jurisdictions(): Option[] {
  return Object.entries(registry().jurisdictions)
    .map(([id, spec]) => ({ id, label: spec.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Refuse a combination the registry does not declare, before a row is written.
 * The worker would reject it too, but failing at submit time is a better
 * experience than failing three minutes into a job.
 */
export function combinationExists(causeOfAction: string, jurisdiction: string): boolean {
  const spec = registry().causes_of_action[causeOfAction];
  return Boolean(spec?.jurisdictions.includes(jurisdiction));
}
