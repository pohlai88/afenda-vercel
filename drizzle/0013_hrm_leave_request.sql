-- Phase 2B: Leave request + single-step approval
-- Follows camelCase SQL column naming convention (matches existing hrm_* tables).
-- Actions: lib/features/hrm/actions/leave-request.actions.ts
--          lib/features/hrm/actions/leave-approval.actions.ts
-- Engine:  lib/features/hrm/data/leave-balance.server.ts

-- ---------------------------------------------------------------------------
-- hrm_approval: generic single-step HR approval (MVP)
-- subjectKind + subjectId discriminates the domain (leave_request|claim|etc.).
-- snapshot is immutable — approvers decide on what they saw, never a mutable record.
-- Deferred: routeCode, routeVersion, currentStep, totalSteps, currentRunId (multi-step).
-- ---------------------------------------------------------------------------
CREATE TABLE "hrm_approval" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  -- leave_request | claim | payroll_finalize | termination | contract_change
  "subjectKind" text NOT NULL,
  "subjectId" text NOT NULL,
  -- pending | approved | rejected | cancelled | expired
  "state" text NOT NULL DEFAULT 'pending',
  "requestedByUserId" text NOT NULL,
  "requestedAt" timestamp NOT NULL DEFAULT now(),
  "currentApproverUserId" text,
  "decisionByUserId" text,
  "decisionAt" timestamp,
  "decisionNote" text,
  "snapshot" jsonb NOT NULL DEFAULT '{}',
  "auditOrigin" text NOT NULL DEFAULT 'production',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE INDEX "hrm_approval_org_state_approver_idx"
  ON "hrm_approval" ("organizationId", "state", "currentApproverUserId");
--> statement-breakpoint

CREATE INDEX "hrm_approval_org_subject_idx"
  ON "hrm_approval" ("organizationId", "subjectKind", "subjectId");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- hrm_leave_request: employee leave application state machine
-- states: draft → submitted → approved | rejected; approved → taken | cancelled
-- currentApprovalRunId: Workflow DevKit run ID reserved for Phase 3+ (nullable).
-- ---------------------------------------------------------------------------
CREATE TABLE "hrm_leave_request" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL REFERENCES "hrm_employee"("id") ON DELETE RESTRICT,
  "leaveTypeId" text NOT NULL REFERENCES "hrm_leave_type"("id") ON DELETE RESTRICT,
  "requestedAt" timestamp NOT NULL DEFAULT now(),
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "durationDays" numeric(5,2) NOT NULL,
  -- none | morning | afternoon
  "halfDay" text NOT NULL DEFAULT 'none',
  "reason" text,
  "evidenceDocumentId" text,
  -- draft | submitted | approved | rejected | cancelled | taken
  "state" text NOT NULL DEFAULT 'submitted',
  "currentApprovalId" text REFERENCES "hrm_approval"("id") ON DELETE SET NULL,
  -- reserved for Workflow DevKit (Phase 3+)
  "currentApprovalRunId" text,
  "approvedByUserId" text,
  "approvedAt" timestamp,
  "rejectedReason" text,
  "policyVersion" text,
  "temporalPast" jsonb,
  "temporalNow" jsonb,
  "temporalNext" jsonb,
  "audit7w1h" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE INDEX "hrm_leave_request_org_employee_state_idx"
  ON "hrm_leave_request" ("organizationId", "employeeId", "state");
--> statement-breakpoint

CREATE INDEX "hrm_leave_request_org_state_start_idx"
  ON "hrm_leave_request" ("organizationId", "state", "startDate");
--> statement-breakpoint

CREATE INDEX "hrm_leave_request_org_leave_type_idx"
  ON "hrm_leave_request" ("organizationId", "leaveTypeId");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- hrm_leave_balance: denormalised balance cache per (employee, leaveType, year)
-- formula: available = openingDays + daysEntitled + adjustedDays + carriedForwardDays
--                      − daysTaken − daysPending
-- Recomputed from scratch on every leave request state change — idempotent.
-- ---------------------------------------------------------------------------
CREATE TABLE "hrm_leave_balance" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL REFERENCES "hrm_employee"("id") ON DELETE RESTRICT,
  "leaveTypeId" text NOT NULL REFERENCES "hrm_leave_type"("id") ON DELETE RESTRICT,
  "entitlementYear" integer NOT NULL,
  "daysEntitled" numeric(6,2) NOT NULL DEFAULT 0,
  "daysTaken" numeric(6,2) NOT NULL DEFAULT 0,
  "daysPending" numeric(6,2) NOT NULL DEFAULT 0,
  "openingDays" numeric(6,2) NOT NULL DEFAULT 0,
  "adjustedDays" numeric(6,2) NOT NULL DEFAULT 0,
  "carriedForwardDays" numeric(6,2) NOT NULL DEFAULT 0,
  "lastRecomputedAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX "hrm_leave_balance_unique_idx"
  ON "hrm_leave_balance" ("organizationId", "employeeId", "leaveTypeId", "entitlementYear");
--> statement-breakpoint

CREATE INDEX "hrm_leave_balance_org_employee_idx"
  ON "hrm_leave_balance" ("organizationId", "employeeId");
