CREATE TABLE "hrm_absence_analytics_threshold" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"config" jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_eligibility_rule" ADD COLUMN "legalEntityCode" text;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_eligibility_rule" ADD COLUMN "countryCode" text;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_eligibility_rule" ADD COLUMN "workLocationCode" text;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_eligibility_rule" ADD COLUMN "positionId" text;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_eligibility_rule" ADD COLUMN "workerCategory" text;--> statement-breakpoint
ALTER TABLE "hrm_flexible_work_eligibility_rule" ADD COLUMN "policyGroupCode" text;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_absence_analytics_threshold_org_uidx" ON "hrm_absence_analytics_threshold" USING btree ("organizationId");