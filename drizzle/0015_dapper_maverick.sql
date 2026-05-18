CREATE TABLE "hrm_bonus_adjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"payoutId" text NOT NULL,
	"adjustmentType" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"reason" text NOT NULL,
	"approvalReference" text,
	"adjustedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"cycleId" text NOT NULL,
	"employeeId" text NOT NULL,
	"eligibilityState" text DEFAULT 'eligible' NOT NULL,
	"eligibilitySnapshot" jsonb,
	"assignedByUserId" text,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_clawback" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"payoutId" text NOT NULL,
	"clawbackType" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"reason" text NOT NULL,
	"recoveryState" text DEFAULT 'recorded' NOT NULL,
	"recoveryReference" text,
	"recordedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"cutoffDate" date,
	"approvalDate" date,
	"payoutDate" date NOT NULL,
	"payrollPeriodId" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"calculationSnapshot" jsonb,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_payout" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"planId" text NOT NULL,
	"cycleId" text NOT NULL,
	"assignmentId" text,
	"employeeId" text NOT NULL,
	"payoutNumber" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"targetAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"achievementPercent" numeric(9, 4) DEFAULT '0' NOT NULL,
	"calculatedAmount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"adjustedAmount" numeric(15, 2),
	"approvedAmount" numeric(15, 2),
	"currency" text DEFAULT 'MYR' NOT NULL,
	"calculationSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validationFlags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prorationFactor" numeric(9, 6) DEFAULT '1' NOT NULL,
	"multiplierSnapshot" jsonb,
	"accountingAllocation" jsonb,
	"currentApprovalId" text,
	"payrollPeriodId" text,
	"paidByPayrollLineId" text,
	"paidAt" timestamp,
	"lockedAt" timestamp,
	"lockedByUserId" text,
	"rejectionReason" text,
	"returnedReason" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"planType" text NOT NULL,
	"payoutFormulaType" text NOT NULL,
	"payoutFormulaConfig" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"eligibilityRules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"targetType" text DEFAULT 'individual' NOT NULL,
	"capAmount" numeric(15, 2),
	"floorAmount" numeric(15, 2),
	"guaranteedAmount" numeric(15, 2),
	"defaultCurrency" text DEFAULT 'MYR' NOT NULL,
	"defaultPayrollLineCode" text DEFAULT 'BONUS_INCENTIVE' NOT NULL,
	"accountingAllocation" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_bonus_target" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"cycleId" text NOT NULL,
	"assignmentId" text,
	"employeeId" text,
	"targetScope" text NOT NULL,
	"targetMetric" text NOT NULL,
	"targetValue" numeric(18, 4) DEFAULT '0' NOT NULL,
	"actualValue" numeric(18, 4),
	"achievementPercent" numeric(9, 4),
	"weight" numeric(9, 4) DEFAULT '1',
	"sourceReference" text,
	"enteredByUserId" text,
	"enteredAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD COLUMN "bonusPayoutId" text;--> statement-breakpoint
ALTER TABLE "hrm_bonus_adjustment" ADD CONSTRAINT "hrm_bonus_adjustment_payoutId_hrm_bonus_payout_id_fk" FOREIGN KEY ("payoutId") REFERENCES "public"."hrm_bonus_payout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_assignment" ADD CONSTRAINT "hrm_bonus_assignment_planId_hrm_bonus_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_bonus_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_assignment" ADD CONSTRAINT "hrm_bonus_assignment_cycleId_hrm_bonus_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_bonus_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_assignment" ADD CONSTRAINT "hrm_bonus_assignment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_clawback" ADD CONSTRAINT "hrm_bonus_clawback_payoutId_hrm_bonus_payout_id_fk" FOREIGN KEY ("payoutId") REFERENCES "public"."hrm_bonus_payout"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_cycle" ADD CONSTRAINT "hrm_bonus_cycle_planId_hrm_bonus_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_bonus_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_cycle" ADD CONSTRAINT "hrm_bonus_cycle_payrollPeriodId_hrm_payroll_period_id_fk" FOREIGN KEY ("payrollPeriodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_planId_hrm_bonus_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."hrm_bonus_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_cycleId_hrm_bonus_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_bonus_cycle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_assignmentId_hrm_bonus_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_bonus_assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_payout" ADD CONSTRAINT "hrm_bonus_payout_payrollPeriodId_hrm_payroll_period_id_fk" FOREIGN KEY ("payrollPeriodId") REFERENCES "public"."hrm_payroll_period"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_target" ADD CONSTRAINT "hrm_bonus_target_cycleId_hrm_bonus_cycle_id_fk" FOREIGN KEY ("cycleId") REFERENCES "public"."hrm_bonus_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_target" ADD CONSTRAINT "hrm_bonus_target_assignmentId_hrm_bonus_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."hrm_bonus_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_bonus_target" ADD CONSTRAINT "hrm_bonus_target_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_bonus_adjustment_org_payout_idx" ON "hrm_bonus_adjustment" USING btree ("organizationId","payoutId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_assignment_org_cycle_employee_uidx" ON "hrm_bonus_assignment" USING btree ("organizationId","cycleId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_assignment_org_plan_idx" ON "hrm_bonus_assignment" USING btree ("organizationId","planId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_assignment_org_employee_idx" ON "hrm_bonus_assignment" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_clawback_org_payout_idx" ON "hrm_bonus_clawback" USING btree ("organizationId","payoutId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_clawback_org_state_idx" ON "hrm_bonus_clawback" USING btree ("organizationId","recoveryState");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_cycle_org_code_uidx" ON "hrm_bonus_cycle" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_bonus_cycle_org_plan_idx" ON "hrm_bonus_cycle" USING btree ("organizationId","planId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_cycle_org_state_idx" ON "hrm_bonus_cycle" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_bonus_cycle_org_period_idx" ON "hrm_bonus_cycle" USING btree ("organizationId","periodStart","periodEnd");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_payout_org_number_uidx" ON "hrm_bonus_payout" USING btree ("organizationId","payoutNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_payout_org_cycle_employee_uidx" ON "hrm_bonus_payout" USING btree ("organizationId","cycleId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_payout_org_cycle_state_idx" ON "hrm_bonus_payout" USING btree ("organizationId","cycleId","state");--> statement-breakpoint
CREATE INDEX "hrm_bonus_payout_org_employee_idx" ON "hrm_bonus_payout" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_payout_org_payroll_period_idx" ON "hrm_bonus_payout" USING btree ("organizationId","payrollPeriodId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_bonus_plan_org_code_uidx" ON "hrm_bonus_plan" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_bonus_plan_org_active_idx" ON "hrm_bonus_plan" USING btree ("organizationId","isActive");--> statement-breakpoint
CREATE INDEX "hrm_bonus_plan_org_type_idx" ON "hrm_bonus_plan" USING btree ("organizationId","planType");--> statement-breakpoint
CREATE INDEX "hrm_bonus_target_org_cycle_idx" ON "hrm_bonus_target" USING btree ("organizationId","cycleId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_target_org_employee_idx" ON "hrm_bonus_target" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_bonus_target_org_assignment_idx" ON "hrm_bonus_target" USING btree ("organizationId","assignmentId");--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_bonus_payout_id_idx" ON "hrm_payroll_line" USING btree ("bonusPayoutId");