import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
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
