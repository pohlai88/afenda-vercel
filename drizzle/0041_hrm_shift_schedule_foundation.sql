CREATE TABLE "hrm_shift_template" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"defaultStartTime" text NOT NULL,
	"defaultEndTime" text NOT NULL,
	"unpaidBreakMinutes" integer DEFAULT 0 NOT NULL,
	"paidBreakMinutes" integer DEFAULT 0 NOT NULL,
	"lateGraceMinutes" integer DEFAULT 0 NOT NULL,
	"earlyOutGraceMinutes" integer DEFAULT 0 NOT NULL,
	"overtimeGraceMinutes" integer DEFAULT 0 NOT NULL,
	"maxContinuousClockMinutes" integer DEFAULT 960 NOT NULL,
	"holidayBehavior" text DEFAULT 'scheduled' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_template_code_format_chk" CHECK ("code" ~ '^[A-Z0-9_]{1,24}$'),
	CONSTRAINT "hrm_shift_template_start_time_format_chk" CHECK ("defaultStartTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "hrm_shift_template_end_time_format_chk" CHECK ("defaultEndTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "hrm_shift_template_nonnegative_minutes_chk" CHECK ("unpaidBreakMinutes" >= 0 AND "paidBreakMinutes" >= 0 AND "lateGraceMinutes" >= 0 AND "earlyOutGraceMinutes" >= 0 AND "overtimeGraceMinutes" >= 0),
	CONSTRAINT "hrm_shift_template_positive_max_duration_chk" CHECK ("maxContinuousClockMinutes" > 0),
	CONSTRAINT "hrm_shift_template_holiday_behavior_chk" CHECK ("holidayBehavior" IN ('scheduled', 'skip', 'paid_holiday'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_template_org_code_uidx" ON "hrm_shift_template" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "hrm_shift_template_org_active_idx" ON "hrm_shift_template" USING btree ("organizationId","isActive","code");--> statement-breakpoint
CREATE TABLE "hrm_shift_assignment" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"shiftTemplateId" text NOT NULL,
	"attendanceDate" date NOT NULL,
	"scheduledStartAt" timestamp NOT NULL,
	"scheduledEndAt" timestamp NOT NULL,
	"templateCode" text NOT NULL,
	"templateName" text NOT NULL,
	"unpaidBreakMinutes" integer DEFAULT 0 NOT NULL,
	"paidBreakMinutes" integer DEFAULT 0 NOT NULL,
	"lateGraceMinutes" integer DEFAULT 0 NOT NULL,
	"earlyOutGraceMinutes" integer DEFAULT 0 NOT NULL,
	"overtimeGraceMinutes" integer DEFAULT 0 NOT NULL,
	"maxContinuousClockMinutes" integer DEFAULT 960 NOT NULL,
	"holidayBehavior" text DEFAULT 'scheduled' NOT NULL,
	"policySnapshot" jsonb NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_shift_assignment_window_order_chk" CHECK ("scheduledEndAt" > "scheduledStartAt"),
	CONSTRAINT "hrm_shift_assignment_nonnegative_minutes_chk" CHECK ("unpaidBreakMinutes" >= 0 AND "paidBreakMinutes" >= 0 AND "lateGraceMinutes" >= 0 AND "earlyOutGraceMinutes" >= 0 AND "overtimeGraceMinutes" >= 0),
	CONSTRAINT "hrm_shift_assignment_positive_max_duration_chk" CHECK ("maxContinuousClockMinutes" > 0),
	CONSTRAINT "hrm_shift_assignment_holiday_behavior_chk" CHECK ("holidayBehavior" IN ('scheduled', 'skip', 'paid_holiday'))
);
--> statement-breakpoint
ALTER TABLE "hrm_shift_assignment" ADD CONSTRAINT "hrm_shift_assignment_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_shift_assignment" ADD CONSTRAINT "hrm_shift_assignment_shiftTemplateId_hrm_shift_template_id_fk" FOREIGN KEY ("shiftTemplateId") REFERENCES "public"."hrm_shift_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_shift_assignment_org_employee_date_uidx" ON "hrm_shift_assignment" USING btree ("organizationId","employeeId","attendanceDate");--> statement-breakpoint
CREATE INDEX "hrm_shift_assignment_org_date_idx" ON "hrm_shift_assignment" USING btree ("organizationId","attendanceDate");--> statement-breakpoint
CREATE INDEX "hrm_shift_assignment_org_template_idx" ON "hrm_shift_assignment" USING btree ("organizationId","shiftTemplateId");
