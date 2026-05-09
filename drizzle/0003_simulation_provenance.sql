-- Simulation provenance: never mix simulated rows with production truth in exports by default.
ALTER TABLE "iam_audit_event" ADD COLUMN "auditOrigin" text DEFAULT 'production' NOT NULL;
--> statement-breakpoint
ALTER TABLE "iam_audit_event" ADD COLUMN "simulationRunId" text;
--> statement-breakpoint
ALTER TABLE "iam_audit_event" ADD COLUMN "scenarioId" text;
--> statement-breakpoint
ALTER TABLE "iam_audit_event" ADD COLUMN "scenarioVersion" integer;
--> statement-breakpoint
ALTER TABLE "iam_audit_event" ADD COLUMN "simulationSeed" text;
--> statement-breakpoint
ALTER TABLE "iam_audit_event" ADD COLUMN "auditActorMode" text DEFAULT 'user' NOT NULL;
--> statement-breakpoint
CREATE INDEX "iam_audit_event_organizationId_auditOrigin_createdAt_idx" ON "iam_audit_event" USING btree ("organizationId","auditOrigin","createdAt");
--> statement-breakpoint
ALTER TABLE "onething" ADD COLUMN "auditOrigin" text DEFAULT 'production' NOT NULL;
--> statement-breakpoint
ALTER TABLE "onething" ADD COLUMN "simulationRunId" text;
--> statement-breakpoint
ALTER TABLE "onething" ADD COLUMN "scenarioId" text;
--> statement-breakpoint
ALTER TABLE "onething" ADD COLUMN "scenarioVersion" integer;
--> statement-breakpoint
ALTER TABLE "onething" ADD COLUMN "simulationSeed" text;
