import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@uc/db";

/**
 * The submit-time half of the spend cap. The worker holds the authoritative
 * one (`services/agent/agent/budget.py`) because the worker is what spends the
 * money; this exists so a lawyer is told "no" at submit rather than watching a
 * progress bar for a job that will be refused.
 *
 * DELIBERATELY DUPLICATED across the two services. Invariant 1 says the
 * database is the only interface between them, so there is no shared module to
 * import — the alternative to duplication is an HTTP call, which costs more
 * than it buys. The two read the same environment variables, and the worker's
 * refusal is the one that protects the account. Keep the defaults in step;
 * there is a test that fails if the numbers drift.
 *
 * The ledger is `generation_nodes`, not `generations.cost_usd` — the rollup is
 * only written when a run finishes, so an in-flight runaway is invisible to it.
 */

const DEFAULT_WINDOW_CAP_USD = 300;
const DEFAULT_PER_USER_DAILY = 20;
const DEFAULT_WINDOW_DAYS = 30;

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  // Render sets an unused variable to empty rather than unsetting it, and an
  // empty string coerces to 0 — which would refuse every job. Treat it as unset.
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, got ${JSON.stringify(raw)}`);
  }
  return value;
}

export function windowCapUsd(): number {
  return numberFromEnv("SPEND_CAP_WINDOW_USD", DEFAULT_WINDOW_CAP_USD);
}

export function windowDays(): number {
  return numberFromEnv("SPEND_WINDOW_DAYS", DEFAULT_WINDOW_DAYS);
}

export function perUserDailyLimit(): number {
  return numberFromEnv("GENERATIONS_PER_USER_PER_DAY", DEFAULT_PER_USER_DAILY);
}

export type SpendVerdict =
  | { ok: true }
  | { ok: false; reason: "window_cap" | "user_daily_limit"; message: string };

/**
 * Two different questions, so two checks.
 *
 * The window cap protects the account from a bad build or a loop. The per-user
 * daily limit protects it from ordinary enthusiasm, and gives a useful error
 * rather than a mysterious one when a single user is the cause.
 *
 * The message is shown to a lawyer, so it says what to do next rather than
 * quoting a dollar figure at them.
 */
export async function checkSpendBeforeQueueing(userId: string): Promise<SpendVerdict> {
  const days = windowDays();

  const [spend] = await db().execute<{ spent: string }>(sql`
    select coalesce(sum(cost_usd), 0)::text as spent
      from generation_nodes
     where started_at >= now() - make_interval(days => ${days})
  `);

  if (Number(spend?.spent ?? 0) >= windowCapUsd()) {
    return {
      ok: false,
      reason: "window_cap",
      message: "Drafting is paused while we review usage. Please try again later.",
    };
  }

  const [count] = await db().execute<{ n: string }>(sql`
    select count(*)::text as n
      from generations
     where user_id = ${userId}
       and created_at >= now() - interval '1 day'
  `);

  if (Number(count?.n ?? 0) >= perUserDailyLimit()) {
    return {
      ok: false,
      reason: "user_daily_limit",
      message: "You have reached today's limit on new drafts. It resets 24 hours after your first draft today.",
    };
  }

  return { ok: true };
}
