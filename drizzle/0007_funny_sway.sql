CREATE TABLE "hrm_overtime_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"workDate" date NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"durationMinutes" integer NOT NULL,
	"timingKind" text DEFAULT 'actual' NOT NULL,
	"dayCategory" text DEFAULT 'normal_day' NOT NULL,
	"reason" text,
	"initiatedBy" text DEFAULT 'employee' NOT NULL,
	"state" text DEFAULT 'submitted' NOT NULL,
	"payableMinutes" integer,
	"currentApprovalId" text,
	"approvedByUserId" text,
	"approvedAt" timestamp,
	"rejectedReason" text,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text
);
--> statement-breakpoint
ALTER TABLE "hrm_overtime_request" ADD CONSTRAINT "hrm_overtime_request_employeeId_hrm_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."hrm_employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrm_overtime_request" ADD CONSTRAINT "hrm_overtime_request_currentApprovalId_hrm_approval_id_fk" FOREIGN KEY ("currentApprovalId") REFERENCES "public"."hrm_approval"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hrm_overtime_request_org_employee_state_idx" ON "hrm_overtime_request" USING btree ("organizationId","employeeId","state");--> statement-breakpoint
CREATE INDEX "hrm_overtime_request_org_state_work_date_idx" ON "hrm_overtime_request" USING btree ("organizationId","state","workDate");