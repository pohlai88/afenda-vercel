CREATE TABLE "hrm_overtime_calculation_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"approvedMinutes" integer NOT NULL,
	"payableMinutes" integer NOT NULL,
	"multiplierHundredths" integer NOT NULL,
	"earningCode" text NOT NULL,
	"capApplied" boolean DEFAULT false NOT NULL,
	"attendanceMinutes" integer,
	"attendanceVarianceMinutes" integer,
	"calculatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_overtime_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"minDurationMinutes" integer DEFAULT 0 NOT NULL,
	"dailyCapMinutes" integer,
	"weeklyCapMinutes" integer,
	"monthlyCapMinutes" integer,
	"roundingIntervalMinutes" integer,
	"roundingMode" text DEFAULT 'none' NOT NULL,
	"compareAttendanceEnabled" boolean DEFAULT false NOT NULL,
	"defaultEarningCode" text DEFAULT 'OT' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "hrm_overtime_rate_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"overtimeTypeId" text NOT NULL,
	"multiplierHundredths" integer DEFAULT 100 NOT NULL,
	"countryCode" text,
	"workerCategory" text,
	"earningCode" text,
	"effectiveFrom" date,
	"effectiveTo" date,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_overtime_calculation_snapshot" ADD CONSTRAINT "hrm_overtime_calculation_snapshot_requestId_hrm_overtime_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_overtime_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_overtime_rate_rule" ADD CONSTRAINT "hrm_overtime_rate_rule_overtimeTypeId_hrm_overtime_type_id_fk" FOREIGN KEY ("overtimeTypeId") REFERENCES "public"."hrm_overtime_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_overtime_calc_snapshot_request_uidx" ON "hrm_overtime_calculation_snapshot" USING btree ("requestId");--> statement-breakpoint
CREATE INDEX "hrm_overtime_calc_snapshot_org_idx" ON "hrm_overtime_calculation_snapshot" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_overtime_policy_org_uidx" ON "hrm_overtime_policy" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "hrm_overtime_rate_org_type_idx" ON "hrm_overtime_rate_rule" USING btree ("organizationId","overtimeTypeId");