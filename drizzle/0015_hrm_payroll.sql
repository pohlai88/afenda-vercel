-- Phase 3A: Payroll preparation — period lifecycle, per-employee runs, granular lines
-- Tables: hrm_payroll_period, hrm_payroll_run, hrm_payroll_line
-- Also adds FK constraint on hrm_attendance_day.lockedByPayrollPeriodId

--> statement-breakpoint
CREATE TABLE "hrm_payroll_period" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "periodStart" date NOT NULL,
  "periodEnd" date NOT NULL,
  "paymentDate" date NOT NULL,
  "currency" text NOT NULL DEFAULT 'MYR',
  "state" text NOT NULL DEFAULT 'open',
  "lockedByUserId" text,
  "lockedAt" timestamp,
  "finalizedRunId" text,
  "rulePackVersion" text,
  "temporalPast" jsonb,
  "temporalNow" jsonb,
  "temporalNext" jsonb,
  "createdByUserId" text,
  "updatedByUserId" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_period_org_start_end_uidx" ON "hrm_payroll_period" ("organizationId", "periodStart", "periodEnd");
--> statement-breakpoint
CREATE INDEX "hrm_payroll_period_org_state_idx" ON "hrm_payroll_period" ("organizationId", "state");
--> statement-breakpoint
CREATE INDEX "hrm_payroll_period_org_start_idx" ON "hrm_payroll_period" ("organizationId", "periodStart");
--> statement-breakpoint
CREATE TABLE "hrm_payroll_run" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "periodId" text NOT NULL,
  "employeeId" text NOT NULL,
  "contractId" text,
  "profileId" text,
  "state" text NOT NULL DEFAULT 'draft',
  "grossPay" numeric(15, 2) NOT NULL DEFAULT 0,
  "netPay" numeric(15, 2) NOT NULL DEFAULT 0,
  "employerCost" numeric(15, 2) NOT NULL DEFAULT 0,
  "inputDigest" text,
  "computedAt" timestamp,
  "computedByUserId" text,
  "overriddenFromBureau" boolean NOT NULL DEFAULT false,
  "bureauReference" text,
  "validationIssues" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "temporalPast" jsonb,
  "temporalNow" jsonb,
  "temporalNext" jsonb,
  "audit7w1h" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD CONSTRAINT "hrm_payroll_run_periodId_hrm_payroll_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "hrm_payroll_period"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD CONSTRAINT "hrm_payroll_run_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "hrm_employee"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD CONSTRAINT "hrm_payroll_run_contractId_hrm_employment_contract_id_fk" FOREIGN KEY ("contractId") REFERENCES "hrm_employment_contract"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "hrm_payroll_run" ADD CONSTRAINT "hrm_payroll_run_profileId_hrm_payroll_profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "hrm_payroll_profile"("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_payroll_run_org_period_employee_uidx" ON "hrm_payroll_run" ("organizationId", "periodId", "employeeId");
--> statement-breakpoint
CREATE INDEX "hrm_payroll_run_org_period_state_idx" ON "hrm_payroll_run" ("organizationId", "periodId", "state");
--> statement-breakpoint
CREATE INDEX "hrm_payroll_run_org_employee_idx" ON "hrm_payroll_run" ("organizationId", "employeeId");
--> statement-breakpoint
CREATE TABLE "hrm_payroll_line" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "runId" text NOT NULL,
  "lineKind" text NOT NULL,
  "code" text NOT NULL,
  "description" text NOT NULL,
  "amount" numeric(15, 2) NOT NULL DEFAULT 0,
  "rulePackProvenance" jsonb,
  "metadata" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD CONSTRAINT "hrm_payroll_line_runId_hrm_payroll_run_id_fk" FOREIGN KEY ("runId") REFERENCES "hrm_payroll_run"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_run_id_idx" ON "hrm_payroll_line" ("runId");
--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_org_run_kind_idx" ON "hrm_payroll_line" ("organizationId", "runId", "lineKind");
--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_org_run_code_idx" ON "hrm_payroll_line" ("organizationId", "runId", "code");
--> statement-breakpoint
-- FK on attendance_day.lockedByPayrollPeriodId (column already exists; adds referential integrity)
ALTER TABLE "hrm_attendance_day" ADD CONSTRAINT "hrm_attendance_day_lockedByPayrollPeriodId_fk"
  FOREIGN KEY ("lockedByPayrollPeriodId") REFERENCES "hrm_payroll_period"("id") ON DELETE RESTRICT;
