-- Phase 5 — Benefits administration: extend benefit stubs + life events table.
ALTER TABLE "hrm_benefit" ADD COLUMN "benefitType" text;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "employerContributionType" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "employerContributionValue" numeric(15, 4);
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "employeeContributionType" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "employeeContributionValue" numeric(15, 4);
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "coverageLevels" jsonb;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "waitingPeriodDays" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "maxAnnualAmount" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "hrm_benefit" ADD COLUMN "effectiveFrom" timestamp;
--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" ADD COLUMN "state" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
UPDATE "hrm_benefit_enrollment"
SET "state" = CASE
  WHEN "terminatedAt" IS NOT NULL THEN 'terminated'
  ELSE 'active'
END;
--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" ADD COLUMN "coverageLevel" text;
--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" ADD COLUMN "effectiveFrom" timestamp;
--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" ADD COLUMN "employerContributionAmount" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" ADD COLUMN "employeeContributionAmount" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "hrm_benefit_enrollment" ADD COLUMN "waivedReason" text;
--> statement-breakpoint
CREATE INDEX "hrm_benefit_enrollment_org_state_idx" ON "hrm_benefit_enrollment" USING btree ("organizationId","state");
--> statement-breakpoint
CREATE TABLE "hrm_benefit_life_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"eventType" text NOT NULL,
	"eventDate" timestamp NOT NULL,
	"notes" text,
	"verificationStatus" text DEFAULT 'pending' NOT NULL,
	"verifiedByUserId" text,
	"verifiedAt" timestamp,
	"verificationNote" text,
	"documentIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_benefit_life_event" ADD CONSTRAINT "hrm_benefit_life_event_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hrm_benefit_life_event_org_employee_idx" ON "hrm_benefit_life_event" USING btree ("organizationId","employeeId");
--> statement-breakpoint
CREATE INDEX "hrm_benefit_life_event_org_type_idx" ON "hrm_benefit_life_event" USING btree ("organizationId","eventType");
