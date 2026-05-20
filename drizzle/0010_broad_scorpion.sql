CREATE TABLE "hrm_overtime_exception" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"requestId" text NOT NULL,
	"exceptionType" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"justification" text,
	"decidedByUserId" text,
	"decidedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrm_overtime_calculation_snapshot" ADD COLUMN "scheduledShiftMinutes" integer;--> statement-breakpoint
ALTER TABLE "hrm_overtime_calculation_snapshot" ADD COLUMN "shiftVarianceMinutes" integer;--> statement-breakpoint
ALTER TABLE "hrm_overtime_calculation_snapshot" ADD COLUMN "amountCents" integer;--> statement-breakpoint
ALTER TABLE "hrm_overtime_calculation_snapshot" ADD COLUMN "amountCurrency" text;--> statement-breakpoint
ALTER TABLE "hrm_overtime_policy" ADD COLUMN "compareShiftEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_overtime_policy" ADD COLUMN "claimDeadlineDays" integer;--> statement-breakpoint
ALTER TABLE "hrm_overtime_policy" ADD COLUMN "allowCompensatoryTime" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hrm_overtime_policy" ADD COLUMN "compensatoryLeaveTypeCode" text;--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD COLUMN "overtimeRequestId" text;--> statement-breakpoint
ALTER TABLE "hrm_overtime_exception" ADD CONSTRAINT "hrm_overtime_exception_requestId_hrm_overtime_request_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."hrm_overtime_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_overtime_exception_org_state_idx" ON "hrm_overtime_exception" USING btree ("organizationId","state");--> statement-breakpoint
CREATE INDEX "hrm_overtime_exception_request_idx" ON "hrm_overtime_exception" USING btree ("requestId");--> statement-breakpoint
ALTER TABLE "hrm_payroll_line" ADD CONSTRAINT "hrm_payroll_line_overtimeRequestId_hrm_overtime_request_id_fk" FOREIGN KEY ("overtimeRequestId") REFERENCES "public"."hrm_overtime_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_payroll_line_overtime_request_id_idx" ON "hrm_payroll_line" USING btree ("overtimeRequestId");