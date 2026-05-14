-- Viet-ERP parity: recruitment ATS, offboarding, bulk import sessions,
-- review competency JSON, attendance check-in IP.

CREATE TABLE "hrm_job_requisition" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "title" text NOT NULL,
  "departmentId" text REFERENCES "hrm_department"("id") ON DELETE SET NULL,
  "headcount" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'draft',
  "approverUserId" text,
  "audit7w1h" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE INDEX "hrm_job_requisition_org_status_idx"
  ON "hrm_job_requisition" ("organizationId", "status");
--> statement-breakpoint

CREATE INDEX "hrm_job_requisition_org_department_idx"
  ON "hrm_job_requisition" ("organizationId", "departmentId");
--> statement-breakpoint

CREATE TABLE "hrm_candidate" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "legalName" text NOT NULL,
  "email" text,
  "phone" text,
  "resumeUrl" text,
  "source" text,
  "archivedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE INDEX "hrm_candidate_org_email_idx"
  ON "hrm_candidate" ("organizationId", "email");
--> statement-breakpoint

CREATE INDEX "hrm_candidate_org_archived_idx"
  ON "hrm_candidate" ("organizationId", "archivedAt");
--> statement-breakpoint

CREATE TABLE "hrm_application" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "candidateId" text NOT NULL REFERENCES "hrm_candidate"("id") ON DELETE RESTRICT,
  "requisitionId" text NOT NULL REFERENCES "hrm_job_requisition"("id") ON DELETE RESTRICT,
  "stage" text NOT NULL DEFAULT 'applied',
  "audit7w1h" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE UNIQUE INDEX "hrm_application_org_candidate_requisition_uidx"
  ON "hrm_application" ("organizationId", "candidateId", "requisitionId");
--> statement-breakpoint

CREATE INDEX "hrm_application_org_stage_idx"
  ON "hrm_application" ("organizationId", "stage");
--> statement-breakpoint

CREATE INDEX "hrm_application_org_requisition_idx"
  ON "hrm_application" ("organizationId", "requisitionId");
--> statement-breakpoint

CREATE TABLE "hrm_interview" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "applicationId" text NOT NULL REFERENCES "hrm_application"("id") ON DELETE CASCADE,
  "interviewerUserId" text NOT NULL,
  "scheduledAt" timestamp NOT NULL,
  "feedback" jsonb,
  "outcome" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE INDEX "hrm_interview_org_application_idx"
  ON "hrm_interview" ("organizationId", "applicationId");
--> statement-breakpoint

CREATE INDEX "hrm_interview_org_scheduled_idx"
  ON "hrm_interview" ("organizationId", "scheduledAt");
--> statement-breakpoint

CREATE TABLE "hrm_offboarding_instance" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL REFERENCES "hrm_employee"("id") ON DELETE RESTRICT,
  "terminationDate" date NOT NULL,
  "checklist" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "audit7w1h" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE INDEX "hrm_offboarding_instance_org_employee_idx"
  ON "hrm_offboarding_instance" ("organizationId", "employeeId");
--> statement-breakpoint

CREATE INDEX "hrm_offboarding_instance_org_status_idx"
  ON "hrm_offboarding_instance" ("organizationId", "status");
--> statement-breakpoint

CREATE TABLE "hrm_import_session" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "importType" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "rowCount" integer NOT NULL DEFAULT 0,
  "errorJson" jsonb,
  "rollbackJson" jsonb,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "hrm_import_session_org_status_idx"
  ON "hrm_import_session" ("organizationId", "status");
--> statement-breakpoint

CREATE INDEX "hrm_import_session_org_type_idx"
  ON "hrm_import_session" ("organizationId", "importType");
--> statement-breakpoint

ALTER TABLE "hrm_review" ADD COLUMN "competencyScoresJson" jsonb;
--> statement-breakpoint

ALTER TABLE "hrm_attendance_event" ADD COLUMN "checkInIp" text;
