-- Overtime / business-trip time reports (leave-adjacent).
-- `hrm_approval.subjectKind = 'time_report'`, `subjectId` = `hrm_time_report.id`.
-- Actions: lib/features/hrm/actions/time-report.actions.ts,
--           lib/features/hrm/actions/time-report-approval.actions.ts

CREATE TABLE "hrm_time_report" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL REFERENCES "hrm_employee"("id") ON DELETE RESTRICT,
  -- overtime | business_trip
  "reportKind" text NOT NULL,
  "workDate" date,
  "overtimeMinutes" integer,
  "tripStartDate" date,
  "tripEndDate" date,
  "destination" text,
  "reason" text,
  -- submitted | approved | rejected | cancelled
  "state" text NOT NULL DEFAULT 'submitted',
  "currentApprovalId" text REFERENCES "hrm_approval"("id") ON DELETE SET NULL,
  "approvedByUserId" text,
  "approvedAt" timestamp,
  "rejectedReason" text,
  "audit7w1h" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE INDEX "hrm_time_report_org_employee_state_idx"
  ON "hrm_time_report" ("organizationId", "employeeId", "state");
--> statement-breakpoint

CREATE INDEX "hrm_time_report_org_state_kind_idx"
  ON "hrm_time_report" ("organizationId", "state", "reportKind");
