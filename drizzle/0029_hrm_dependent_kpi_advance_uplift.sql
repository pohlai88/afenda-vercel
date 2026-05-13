CREATE TABLE "hrm_dependent" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"legalName" text NOT NULL,
	"relationship" text NOT NULL,
	"dateOfBirth" date,
	"taxDependent" boolean DEFAULT false NOT NULL,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_dependent" ADD CONSTRAINT "hrm_dependent_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hrm_dependent_organizationId_employeeId_idx" ON "hrm_dependent" USING btree ("organizationId","employeeId");
--> statement-breakpoint
CREATE INDEX "hrm_dependent_organizationId_archivedAt_idx" ON "hrm_dependent" USING btree ("organizationId","archivedAt");
--> statement-breakpoint
CREATE TABLE "hrm_employee_change_history" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"fieldName" text NOT NULL,
	"oldValue" jsonb,
	"newValue" jsonb,
	"changedByUserId" text NOT NULL,
	"changedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_employee_change_history" ADD CONSTRAINT "hrm_employee_change_history_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hrm_employee_change_history_org_employee_changedAt_idx" ON "hrm_employee_change_history" USING btree ("organizationId","employeeId","changedAt");
--> statement-breakpoint
CREATE TABLE "hrm_kpi_period" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE INDEX "hrm_kpi_period_organizationId_idx" ON "hrm_kpi_period" USING btree ("organizationId");
--> statement-breakpoint
CREATE TABLE "hrm_kpi_score" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodId" text NOT NULL,
	"employeeId" text NOT NULL,
	"metricCode" text NOT NULL,
	"targetValue" text,
	"achievedValue" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_kpi_score" ADD CONSTRAINT "hrm_kpi_score_periodId_hrm_kpi_period_id_fk" FOREIGN KEY ("periodId") REFERENCES "public"."hrm_kpi_period"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hrm_kpi_score" ADD CONSTRAINT "hrm_kpi_score_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_kpi_score_org_period_employee_metric_uidx" ON "hrm_kpi_score" USING btree ("organizationId","periodId","employeeId","metricCode");
--> statement-breakpoint
CREATE INDEX "hrm_kpi_score_organizationId_periodId_idx" ON "hrm_kpi_score" USING btree ("organizationId","periodId");
--> statement-breakpoint
CREATE TABLE "hrm_salary_advance" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"reason" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"requestedByUserId" text NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"decidedByUserId" text,
	"decidedAt" timestamp,
	"decisionNote" text,
	"repaidAt" timestamp,
	"repaidByPayrollLineId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_salary_advance" ADD CONSTRAINT "hrm_salary_advance_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hrm_salary_advance_org_employee_state_idx" ON "hrm_salary_advance" USING btree ("organizationId","employeeId","state");
--> statement-breakpoint
CREATE INDEX "hrm_salary_advance_org_state_idx" ON "hrm_salary_advance" USING btree ("organizationId","state");
--> statement-breakpoint
ALTER TABLE "hrm_review_cycle" ADD COLUMN "reviewPipeline" text DEFAULT 'single' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "selfRating" text;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "selfNotes" text;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "selfSubmittedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "managerRating" text;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "managerNotes" text;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "managerSubmittedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "hrRating" text;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "hrNotes" text;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "hrSubmittedAt" timestamp;
--> statement-breakpoint
ALTER TABLE "hrm_review" ADD COLUMN "ratingScale" text DEFAULT 'text' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD COLUMN "salaryAdvanceId" text;
--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD CONSTRAINT "hrm_payroll_line_salaryAdvanceId_hrm_salary_advance_id_fk" FOREIGN KEY ("salaryAdvanceId") REFERENCES "public"."hrm_salary_advance"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_salary_advance_id_idx" ON "hrm_payroll_line" USING btree ("salaryAdvanceId");
