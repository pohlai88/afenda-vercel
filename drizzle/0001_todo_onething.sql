ALTER TABLE "todo" ADD COLUMN "oneThingState" text;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "temporalPast" jsonb;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "temporalNow" jsonb;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "temporalNext" jsonb;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "resolvedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "deprecatedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "resolutionNote" text;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "resolutionProof" jsonb;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "predictions" jsonb;
--> statement-breakpoint
ALTER TABLE "todo" ADD COLUMN "audit7w1h" jsonb;
--> statement-breakpoint
CREATE INDEX "todo_organization_id_one_thing_state_idx" ON "todo" USING btree ("organizationId","oneThingState");
