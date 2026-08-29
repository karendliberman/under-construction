import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

/**
 * PHASE 0.6 ONLY — "prove the pipe".
 *
 * This table exists to demonstrate that the web service can write a row and the
 * worker can claim it and write back, in production, before any feature depends
 * on that path. It exercises both Dockerfiles, both deploys, the database from
 * two directions, and the FOR UPDATE SKIP LOCKED claim query.
 *
 * DELETE THIS TABLE when the real schema lands (implementation guide §1).
 * It deliberately mirrors the shape of `generations.status` so the claim query
 * we prove here is the same one the worker will use for real.
 */
export const pipeChecks = pgTable("pipe_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  note: text("note").notNull(),

  // status doubles as the queue, exactly as `generations` will:
  // queued | running | complete | failed
  status: text("status").notNull().default("queued"),

  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  reply: text("reply"),
  workerHost: text("worker_host"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
