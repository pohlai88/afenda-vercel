ALTER TABLE "org_feedback_event" ADD COLUMN "state" text DEFAULT 'new' NOT NULL;
--> statement-breakpoint
ALTER TABLE "org_feedback_event" ADD COLUMN "acknowledgedByUserId" text;
--> statement-breakpoint
ALTER TABLE "org_feedback_event" ADD COLUMN "acknowledgedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "org_feedback_event" ADD COLUMN "resolvedByUserId" text;
--> statement-breakpoint
ALTER TABLE "org_feedback_event" ADD COLUMN "resolvedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "org_feedback_event" ADD COLUMN "resolutionNote" text;
--> statement-breakpoint
CREATE INDEX "org_feedback_event_organizationId_state_createdAt_idx" ON "org_feedback_event" USING btree ("organizationId","state","createdAt");
