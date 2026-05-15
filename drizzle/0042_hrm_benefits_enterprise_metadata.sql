-- HRM benefits enterprise metadata: plan year, provider/carrier, policy reference, eligibility rules, and rate versioning.
ALTER TABLE "hrm_benefit" ADD COLUMN "planYear" integer;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "carrierName" text;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "providerName" text;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "policyReference" text;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "eligibilityRules" jsonb;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "rateTableVersion" text;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "rateTable" jsonb;
--> statement-breakpoint
CREATE INDEX "hrm_benefit_org_plan_year_idx" ON "hrm_benefit" USING btree ("organizationId","planYear");
--> statement-breakpoint
CREATE INDEX "hrm_benefit_org_carrier_idx" ON "hrm_benefit" USING btree ("organizationId","carrierName");
