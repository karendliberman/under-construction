import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  integer,
  numeric,
  jsonb,
  bigserial,
} from "drizzle-orm/pg-core";

/**
 * PHASE 0.6 SCAFFOLDING — delete when `generations` lands (§1).
 *
 * Proved that the web app can write a row and the worker can claim it in
 * production. The worker still polls this table, so it outlives its usefulness
 * by a phase or two; removing it is part of Phase 3, not before, or the
 * deployed worker crash-loops.
 */
export const pipeChecks = pgTable("pipe_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  note: text("note").notNull(),
  status: text("status").notNull().default("queued"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  reply: text("reply"),
  workerHost: text("worker_host"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

/**
 * Access requests are unauthenticated input from the public marketing page.
 * A request is NOT a user — users are only created on approval, which is why
 * there is no pre-approval state on `users`.
 */
export const accessRequests = pgTable(
  "access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    firm: text("firm"),
    barNumber: text("bar_number"),
    jurisdiction: text("jurisdiction"),
    useCase: text("use_case"),

    // pending | approved | denied
    status: text("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("access_requests_status_created_idx").on(t.status, t.createdAt.desc())],
);

/**
 * `password_hash` is null until they follow the set-password link, so "invited
 * but has not set a password" needs no extra column.
 *
 * `status` is a separate question from "is the session valid": suspending
 * someone must take effect on their next request even though their password
 * still works.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  firm: text("firm"),

  // member | admin
  role: text("role").notNull().default("member"),
  // approved | suspended
  status: text("status").notNull().default("approved"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Single-use, short-lived tokens for setting a password.
 *
 * Only the SHA-256 of the token is stored, never the token itself — the same
 * reasoning as a password hash: a leak of this table must not let anyone take
 * over an account. SHA-256 rather than bcrypt is right here because the token
 * is 256 bits of randomness, so there is nothing to brute-force.
 *
 * V0 delivers the link by hand (the admin screen shows it). Swapping in an
 * email sender later needs no change to this table.
 */
export const setPasswordTokens = pgTable(
  "set_password_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("set_password_tokens_user_idx").on(t.userId)],
);

/**
 * A matter is the client engagement a generation belongs to. Deliberately thin
 * in V0 — a label and an owner. It exists now because attaching generations to
 * one later means backfilling rows that never had one.
 */
export const matters = pgTable(
  "matters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("matters_user_created_idx").on(t.userId, t.createdAt.desc())],
);

/**
 * One row per motion. This is the queue (invariant 1: the web app inserts
 * `status = 'queued'`, the worker claims with FOR UPDATE SKIP LOCKED) and the
 * record of what came out.
 *
 * SHAPE NOTE — this is the pipeline shape, not the one-shot shape in
 * `docs/implementation.md` §1. That design had singular `cause_of_action`,
 * `jurisdiction` and `input_facts` columns because a generation was one agent
 * answering one question. A motion now covers N topics of two kinds, so the
 * input is the complaint plus the client-facts form and the topic list is an
 * output rather than an input. `docs/pipeline.md` §11 flagged this; here it is
 * resolved.
 *
 * Jurisdiction is absent on purpose. V0 hardcodes one in configuration, and the
 * dimension returns when there is a second one to support.
 *
 * `complaint_text` and `client_facts` are client-confidential and stored in
 * plaintext under Neon's encryption at rest. Field-level encryption is a
 * pilot gate, not a V0 one — `docs/architecture.md` §10.
 *
 * Invariant 5 still holds: no prompt text and no prompt hash. `playbookVersion`
 * is the git SHA, which is sufficient because the resolver is deterministic.
 *
 * Invariant 7: immutable once `status = 'complete'`, except the `outcome`
 * fields. A re-run is a new row.
 */
export const generations = pgTable(
  "generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matterId: uuid("matter_id").references(() => matters.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    // Inputs.
    complaintText: text("complaint_text").notNull(),
    clientFacts: jsonb("client_facts").notNull(),

    playbookVersion: text("playbook_version"), // git SHA. NO prompt text, NO prompt hash.
    model: text("model"),

    // Outputs. `topics` carries the threshold checklist, which is a deliverable
    // in its own right even when every precondition failed (pipeline.md §1).
    topics: jsonb("topics"),
    motionMarkdown: text("motion_markdown"),
    verification: jsonb("verification"),

    // Rollups cached from `generation_nodes`, which is the actual ledger.
    // Display reads these; the spend cap does not — see `generationNodes`.
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
    latencyMs: integer("latency_ms"),

    // queued | running | complete | failed
    status: text("status").notNull().default("queued"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }), // for the stale sweeper
    // A classification, never raw agent output (pipeline.md §5).
    errorClass: text("error_class"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    // Exists before anything writes to it. The first time Ben learns a motion
    // was granted there has to be somewhere to put it, and reconstructing the
    // history later is impossible.
    // granted | denied | granted_in_part | withdrawn | unknown
    outcome: text("outcome"),
    outcomeNotes: text("outcome_notes"),
    outcomeRecordedAt: timestamp("outcome_recorded_at", { withTimezone: true }),
  },
  (t) => [
    index("generations_user_created_idx").on(t.userId, t.createdAt.desc()),
    // The claim query's index. Partial, so it stays small as the table grows.
    index("generations_queue_idx")
      .on(t.status, t.createdAt)
      .where(sql`${t.status} in ('queued', 'running')`),
  ],
);

/**
 * One row per pipeline node run — roughly forty per motion. This is the
 * progress UI, the cost ledger and the debugging record in one table, and it
 * holds NO case facts (pipeline.md §7).
 *
 * Two fields need care, because both are derived from the complaint and the
 * complaint is client-confidential:
 *
 *   `searchesRun` is a COUNT, never the query strings. A query the Issue
 *   Researcher composed is model output derived from the case facts, so it is
 *   case facts.
 *
 *   `errorClass` is a classification, never raw agent output, for the same
 *   reason. `research_gate_no_cases_passed`, not the model's explanation.
 *
 * `domainsHit` is safe to store because it can only ever contain allowlisted
 * domains — that is enforced in code, not by a prompt (invariant 9).
 *
 * THIS TABLE IS THE SPEND LEDGER. The cap sums `cost_usd` here rather than on
 * `generations`, because a runaway shows up while it is still running and the
 * rollup is only written at the end.
 */
export const generationNodes = pgTable(
  "generation_nodes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    generationId: uuid("generation_id")
      .notNull()
      .references(() => generations.id),
    node: text("node").notNull(), // 'issue_researcher'
    branchKey: text("branch_key"), // 't1-i1'
    // queued | running | complete | failed | skipped
    status: text("status").notNull(),
    attempt: integer("attempt").notNull().default(1),

    turnsUsed: integer("turns_used"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),

    searchesRun: integer("searches_run"), // COUNT only, never the query text
    domainsHit: text("domains_hit").array(), // allowlisted domains, safe to store
    errorClass: text("error_class"), // a classification, not raw agent output

    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("generation_nodes_generation_node_idx").on(t.generationId, t.node),
    // The spend cap's index: sum cost_usd over a rolling window.
    index("generation_nodes_started_idx").on(t.startedAt),
  ],
);
