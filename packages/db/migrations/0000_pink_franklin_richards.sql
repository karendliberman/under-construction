CREATE TABLE "pipe_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"claimed_at" timestamp with time zone,
	"reply" text,
	"worker_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
