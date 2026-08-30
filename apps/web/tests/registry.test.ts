import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * lib/registry.ts caches after first read, and next.config.mjs bakes the
 * registry in as JSON at build time. So each case sets the env var and
 * re-imports with a fresh module registry.
 */
const REGISTRY = {
  shared: ["_shared/guardrails.md"],
  causes_of_action: {
    "breach-of-contract": {
      label: "Breach of Contract",
      procedural: "procedural/rule-12b6-federal.md",
      substantive: "causes-of-action/breach-of-contract.md",
      jurisdictions: ["sdny"],
    },
    fraud: {
      label: "Fraud",
      procedural: "procedural/rule-12b6-federal.md",
      substantive: "causes-of-action/fraud.md",
      jurisdictions: ["sdny", "nd-cal"],
    },
    // Declared but with no jurisdictions — must not reach the picker, or a
    // lawyer can select a pairing that has no playbook behind it.
    negligence: {
      label: "Negligence",
      procedural: "procedural/rule-12b6-federal.md",
      substantive: "causes-of-action/negligence.md",
      jurisdictions: [],
    },
  },
  jurisdictions: {
    sdny: { label: "S.D.N.Y.", file: "jurisdictions/sdny.md" },
    "nd-cal": { label: "N.D. Cal.", file: "jurisdictions/nd-cal.md" },
  },
};

async function load() {
  vi.resetModules();
  process.env.UC_PLAYBOOK_REGISTRY = JSON.stringify(REGISTRY);
  return import("@/lib/registry");
}

beforeEach(() => {
  delete process.env.UC_PLAYBOOK_REGISTRY;
});

describe("registry", () => {
  it("lists only causes of action that have a jurisdiction", async () => {
    const { causesOfAction } = await load();
    const ids = causesOfAction().map((c) => c.id);
    expect(ids).toContain("breach-of-contract");
    expect(ids).toContain("fraud");
    expect(ids).not.toContain("negligence");
  });

  it("sorts by label so the picker has a stable order", async () => {
    const { causesOfAction, jurisdictions } = await load();
    expect(causesOfAction().map((c) => c.label)).toEqual(["Breach of Contract", "Fraud"]);
    expect(jurisdictions().map((j) => j.label)).toEqual(["N.D. Cal.", "S.D.N.Y."]);
  });

  it("accepts a declared pairing and refuses an undeclared one", async () => {
    const { combinationExists } = await load();
    expect(combinationExists("breach-of-contract", "sdny")).toBe(true);
    expect(combinationExists("fraud", "nd-cal")).toBe(true);
    // The court exists and the claim exists, but not together.
    expect(combinationExists("breach-of-contract", "nd-cal")).toBe(false);
    expect(combinationExists("negligence", "sdny")).toBe(false);
    expect(combinationExists("no-such-claim", "sdny")).toBe(false);
  });

  it("exposes labels and ids only — never a path to playbook prose", async () => {
    const { causesOfAction, jurisdictions } = await load();
    const serialised = JSON.stringify([causesOfAction(), jurisdictions()]);
    // INVARIANT 2: filenames are in the registry but must not travel to the
    // browser through these accessors.
    expect(serialised).not.toContain(".md");
    expect(serialised).not.toContain("procedural/");
    expect(serialised).not.toContain("_shared/");
  });

  it("fails loudly if the build did not bake the registry in", async () => {
    vi.resetModules();
    const { causesOfAction } = await import("@/lib/registry");
    expect(() => causesOfAction()).toThrow(/UC_PLAYBOOK_REGISTRY/);
  });
});
