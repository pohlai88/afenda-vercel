CREATE TABLE "hrm_compensation_budget_pool" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"cycleId" text NOT NULL,
	"scopeType" text NOT NULL,
	"scopeId" text NOT NULL,
	"allocatedAmount" numeric(15, 2) NOT NULL,
	"usedAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_compensation_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"cycleType" text NOT NULL,
	"effectiveDate" date NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"eligibilityRules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_compensation_cycle_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"cycleId" text NOT NULL,
	"employeeId" text NOT NULL,
	"eligible" boolean DEFAULT true NOT NULL,
	"eligibilityReasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currentSalaryAmount" numeric(15, 2),
	"salaryCurrency" text DEFAULT 'MYR' NOT NULL,
	"salaryEffectiveDate" date,
	"gradeId" text,
	"jobLevelId" text,
	"departmentId" text,
	"managerEmployeeId" text,
	"bandMinimum" numeric(15, 2),
	"bandMidpoint" numeric(15, 2),
	"bandMaximum" numeric(15, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_compensation_recommendation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"cycleId" text NOT NULL,
	"participantId" text NOT NULL,
	"employeeId" text NOT NULL,
	"adjustmentType" text NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"currentSalaryAmount" numeric(15, 2) NOT NULL,
	"increaseAmount" numeric(15, 2),
	"increasePercentage" numeric(8, 4),
	"proposedSalaryAmount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"exceptionJustification" text,
	"submittedByUserId" text,
	"submittedAt" timestamp,
	"reviewedByUserId" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_compensation_budget_pool" ADD CONSTRAINT "hrm_compensation_budget_pool_cycleId_hrm_compensation_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_compensation_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compensation_cycle_participant" ADD CONSTRAINT "hrm_compensation_cycle_participant_cycleId_hrm_compensation_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_compensation_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compensation_cycle_participant" ADD CONSTRAINT "hrm_compensation_cycle_participant_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compensation_recommendation" ADD CONSTRAINT "hrm_compensation_recommendation_cycleId_hrm_compensation_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_compensation_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compensation_recommendation" ADD CONSTRAINT "hrm_compensation_recommendation_participantId_hrm_compensation_cycle_participant_id_fk" FOREIGN KEY ("participantId") REFERENCES "public"."hrm_compensation_cycle_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_compensation_recommendation" ADD CONSTRAINT "hrm_compensation_recommendation_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compensation_budget_pool_cycle_scope_uidx" ON "hrm_compensation_budget_pool" USING btree ("cycleId","scopeType","scopeId");--> statement-breakpoint
CREATE INDEX "hrm_compensation_budget_pool_org_cycle_idx" ON "hrm_compensation_budget_pool" USING btree ("organizationId","cycleId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compensation_cycle_org_code_uidx" ON "hrm_compensation_cycle" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_compensation_cycle_org_state_idx" ON "hrm_compensation_cycle" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_compensation_cycle_org_effective_idx" ON "hrm_compensation_cycle" USING btree ("organizationId","effectiveDate");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compensation_cycle_participant_cycle_employee_uidx" ON "hrm_compensation_cycle_participant" USING btree ("cycleId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_compensation_cycle_participant_org_cycle_idx" ON "hrm_compensation_cycle_participant" USING btree ("organizationId","cycleId");--> statement-breakpoint
CREATE INDEX "hrm_compensation_cycle_participant_org_eligible_idx" ON "hrm_compensation_cycle_participant" USING btree ("organizationId","cycleId","eligible");--> statement-breakpoint
CREATE INDEX "hrm_compensation_recommendation_org_cycle_state_idx" ON "hrm_compensation_recommendation" USING btree ("organizationId","cycleId","state");--> statement-breakpoint
CREATE INDEX "hrm_compensation_recommendation_org_employee_idx" ON "hrm_compensation_recommendation" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_compensation_recommendation_participant_uidx" ON "hrm_compensation_recommendation" USING btree ("participantId");