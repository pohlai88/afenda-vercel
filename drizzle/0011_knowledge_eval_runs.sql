CREATE TABLE "knowledge_eval_run" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"evalSetId" text NOT NULL,
	"topK" integer NOT NULL,
	"retrievalMode" text NOT NULL,
	"totalCases" integer DEFAULT 0 NOT NULL,
	"recallAtK" numeric(5, 4) NOT NULL,
	"meanReciprocalRank" numeric(5, 4) NOT NULL,
	"evidenceOverlap" numeric(5, 4) NOT NULL,
	"durationMs" integer DEFAULT 0 NOT NULL,
	"createdByUserId" text,
	"judgeModel" text,
	"judgeScore" numeric(5, 4),
	"judgeMetadata" jsonb,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_eval_run" ADD CONSTRAINT "knowledge_eval_run_evalSetId_knowledge_eval_set_id_fk" FOREIGN KEY ("evalSetId") REFERENCES "public"."knowledge_eval_set"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "knowledge_eval_run_organization_eval_set_createdAt_idx" ON "knowledge_eval_run" USING btree ("organizationId","evalSetId","createdAt");
