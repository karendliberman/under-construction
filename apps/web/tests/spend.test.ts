import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * lib/spend.ts reads process.env on every call, so no module reset is needed.
 * The database-backed check is not exercised here — it is plain SQL, and the
 * worker's equivalent is the authoritative one. What is worth testing is the
 * configuration, because a misread cap fails in the expensive direction.
 */

const ENV_KEYS = ["SPEND_CAP_WINDOW_USD", "SPEND_WINDOW_DAYS", "GENERATIONS_PER_USER_PER_DAY"];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("spend cap configuration", () => {
  it("has defaults", async () => {
    const { windowCapUsd, windowDays, perUserDailyLimit } = await import("@/lib/spend");
    expect(windowCapUsd()).toBe(300);
    expect(windowDays()).toBe(30);
    expect(perUserDailyLimit()).toBe(20);
  });

  it("reads the environment", async () => {
    process.env.SPEND_CAP_WINDOW_USD = "42.5";
    process.env.SPEND_WINDOW_DAYS = "7";
    const { windowCapUsd, windowDays } = await import("@/lib/spend");
    expect(windowCapUsd()).toBe(42.5);
    expect(windowDays()).toBe(7);
  });

  it("treats an empty variable as unset rather than as zero", async () => {
    // Render sets an unused variable to empty. Number("") is 0, and a cap of
    // zero refuses every job.
    process.env.SPEND_CAP_WINDOW_USD = "";
    const { windowCapUsd } = await import("@/lib/spend");
    expect(windowCapUsd()).toBe(300);
  });

  it.each(["nonsense", "-5", "0"])("throws on a bad value (%s)", async (bad) => {
    // Failing closed is right: the alternative is quietly running uncapped
    // because someone fat-fingered a value.
    process.env.SPEND_CAP_WINDOW_USD = bad;
    const { windowCapUsd } = await import("@/lib/spend");
    expect(() => windowCapUsd()).toThrow(/SPEND_CAP_WINDOW_USD/);
  });
});

describe("the two services agree", () => {
  /**
   * Invariant 1 means there is no shared module between the web app and the
   * worker, so the caps are written twice. This test is what stops them
   * drifting: raise one default and it fails until the other is raised too.
   */
  const budgetPy = readFileSync(
    fileURLToPath(new URL("../../../services/agent/agent/budget.py", import.meta.url)),
    "utf8",
  );

  it("uses the same window cap default", async () => {
    const { windowCapUsd } = await import("@/lib/spend");
    expect(budgetPy).toContain(`_decimal_env("SPEND_CAP_WINDOW_USD", "${windowCapUsd()}")`);
  });

  it("uses the same window length default", async () => {
    const { windowDays } = await import("@/lib/spend");
    expect(budgetPy).toContain(`os.environ.get("SPEND_WINDOW_DAYS", "${windowDays()}")`);
  });

  it("reads the same env var names", () => {
    for (const name of ["SPEND_CAP_WINDOW_USD", "SPEND_WINDOW_DAYS", "SPEND_CAP_PER_GENERATION_USD"]) {
      expect(budgetPy).toContain(name);
    }
  });
});
