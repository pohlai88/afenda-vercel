CREATE TABLE "hrm_shift_coverage_requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"attendanceDate" date NOT NULL,
	"shiftTemplateId" text NOT NULL,
	"minHeadcount" integer DEFAULT 1 NOT NULL,
	"departmentId" text,
	"locationCode" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_coverage_req_headcount_chk" CHECK ("hrm_shift_coverage_requirement"."minHeadcount" > 0)
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_recurrence_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"shiftTemplateId" text NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date,
	"weekday" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_recurrence_rule_weekday_chk" CHECK ("hrm_shift_recurrence_rule"."weekday" >= 0 AND "hrm_shift_recurrence_rule"."weekday" <= 6)
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_roster_publication" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"publishedAt" timestamp NOT NULL,
	"publishedByUserId" text NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_roster_publication_period_chk" CHECK ("hrm_shift_roster_publication"."periodEnd" >= "hrm_shift_roster_publication"."periodStart")
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_rotation_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"cycleLengthDays" integer DEFAULT 7 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_rotation_cycle_length_chk" CHECK ("hrm_shift_rotation_cycle"."cycleLengthDays" > 0)
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_rotation_step" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"rotationCycleId" text NOT NULL,
	"stepIndex" integer NOT NULL,
	"shiftTemplateId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_rotation_step_index_chk" CHECK ("hrm_shift_rotation_step"."stepIndex" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_scheduling_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"minRestMinutesBetweenShifts" integer DEFAULT 660 NOT NULL,
	"maxScheduledMinutesPerWeek" integer DEFAULT 2880 NOT NULL,
	"warnOnConflict" boolean DEFAULT true NOT NULL,
	"blockOnConflict" boolean DEFAULT false NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_scheduling_policy_nonneg_chk" CHECK ("hrm_shift_scheduling_policy"."minRestMinutesBetweenShifts" >= 0 AND "hrm_shift_scheduling_policy"."maxScheduledMinutesPerWeek" > 0)
);
--> statement-breakpoint
CREATE TABLE "hrm_shift_swap_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requesterEmployeeId" text NOT NULL,
	"requesterAssignmentId" text NOT NULL,
	"counterpartyEmployeeId" text NOT NULL,
	"counterpartyAssignmentId" text NOT NULL,
	"state" text DEFAULT 'submitted' NOT NULL,
	"reason" text NOT NULL,
	"rejectedReason" text,
	"currentApprovalId" text,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_swap_request_state_chk" CHECK ("hrm_shift_swap_request"."state" IN ('submitted', 'approved', 'rejected', 'returned', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "hrm_shift_template" ADD COLUMN "shiftCategory" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_shift_template" ADD COLUMN "patternKind" text DEFAULT 'fixed' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_shift_coverage_requirement" ADD CONSTRAINT "hrm_shift_coverage_requirement_shiftTemplateId_hrm_shift_template_id_fk" FOREIGN KEY ("shiftTemplateId") REFERENCES "public"."hrm_shift_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_recurrence_rule" ADD CONSTRAINT "hrm_shift_recurrence_rule_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_recurrence_rule" ADD CONSTRAINT "hrm_shift_recurrence_rule_shiftTemplateId_hrm_shift_template_id_fk" FOREIGN KEY ("shiftTemplateId") REFERENCES "public"."hrm_shift_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_rotation_step" ADD CONSTRAINT "hrm_shift_rotation_step_rotationCycleId_hrm_shift_rotation_cycle_id_fk" FOREIGN KEY ("rotationCycleId") REFERENCES "public"."hrm_shift_rotation_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_rotation_step" ADD CONSTRAINT "hrm_shift_rotation_step_shiftTemplateId_hrm_shift_template_id_fk" FOREIGN KEY ("shiftTemplateId") REFERENCES "public"."hrm_shift_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_swap_request" ADD CONSTRAINT "hrm_shift_swap_request_requesterEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("requesterEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_swap_request" ADD CONSTRAINT "hrm_shift_swap_request_requesterAssignmentId_hrm_shift_assignment_id_fk" FOREIGN KEY ("requesterAssignmentId") REFERENCES "public"."hrm_shift_assignment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_swap_request" ADD CONSTRAINT "hrm_shift_swap_request_counterpartyEmployeeId_hrm_employee_id_fk" FOREIGN KEY ("counterpartyEmployeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_swap_request" ADD CONSTRAINT "hrm_shift_swap_request_counterpartyAssignmentId_hrm_shift_assignment_id_fk" FOREIGN KEY ("counterpartyAssignmentId") REFERENCES "public"."hrm_shift_assignment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_swap_request" ADD CONSTRAINT "hrm_shift_swap_request_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_shift_coverage_req_org_date_idx" ON "hrm_shift_coverage_requirement" USING btree ("organizationId","attendanceDate");--> statement-breakpoint
CREATE INDEX "hrm_shift_recurrence_rule_org_employee_idx" ON "hrm_shift_recurrence_rule" USING btree ("organizationId","employeeId");--> statement-breakpoint
CREATE INDEX "hrm_shift_roster_publication_org_period_idx" ON "hrm_shift_roster_publication" USING btree ("organizationId","periodStart","periodEnd");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_rotation_cycle_org_code_uidx" ON "hrm_shift_rotation_cycle" USING btree ("organizationId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_rotation_step_cycle_index_uidx" ON "hrm_shift_rotation_step" USING btree ("rotationCycleId","stepIndex");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_scheduling_policy_org_uidx" ON "hrm_shift_scheduling_policy" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "hrm_shift_swap_request_org_state_idx" ON "hrm_shift_swap_request" USING btree ("organizationId","state");