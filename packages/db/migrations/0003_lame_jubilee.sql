CREATE TABLE "generation_nodes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"generation_id" uuid NOT NULL,
	"node" text NOT NULL,
	"branch_key" text,
	"status" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"turns_used" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 4),
	"searches_run" integer,
	"domains_hit" text[],
	"error_class" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid,
	"user_id" uuid NOT NULL,
	"complaint_text" text NOT NULL,
	"client_facts" jsonb NOT NULL,
	"playbook_version" text,
	"model" text,
	"topics" jsonb,
	"motion_markdown" text,
	"verification" jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 4),
	"latency_ms" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"claimed_at" timestamp with time zone,
	"error_class" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text,
	"outcome_notes" text,
	"outcome_recorded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation_nodes" ADD CONSTRAINT "generation_nodes_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_nodes_generation_node_idx" ON "generation_nodes" USING btree ("generation_id","node");--> statement-breakpoint
CREATE INDEX "generation_nodes_started_idx" ON "generation_nodes" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "generations_user_created_idx" ON "generations" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "generations_queue_idx" ON "generations" USING btree ("status","created_at") WHERE "generations"."status" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "matters_user_created_idx" ON "matters" USING btree ("user_id","created_at" DESC NULLS LAST);