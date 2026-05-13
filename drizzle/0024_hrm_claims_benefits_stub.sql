-- Migration 0024: hrm_claims_benefits_stub
--
-- Phase 4 — Claims (reimbursable expense workflow), Benefits stubs, and the
-- payroll-line ↔ claim bridge column.
--
-- Tables:
--   hrm_claim_type           per-org claim catalog (Travel / Medical / Phone / …)
--   hrm_claim                one claim row per submission (state machine)
--   hrm_claim_evidence       claim ↔ hrm_document linkage with evidence type
--   hrm_benefit              STUB — per-org benefit catalog (no UI yet)
--   hrm_benefit_enrollment   STUB — employee ↔ benefit (no UI yet)
--
-- Plus: hrm_payroll_line.claimId — nullable FK enabling
--       payroll-finalize to attach earnings lines to approved unpaid claims.
--
-- State machine for hrm_claim:
--   draft → submitted → approved | rejected      (single-step approval reuses
--                                                  hrm_approval(subjectKind=claim))
--   submitted → cancelled                         (employee withdraws)
--   approved → paid                               (payroll-finalize.workflow.ts
--                                                  writes claimId + flips state)
--
-- Audit grammar:
--   erp.hrm.claim.{submit|cancel|approve|reject|attach_evidence|paid}
--   erp.hrm.benefit.{create|update|enroll|terminate}    (stub — reserved)

-- ---------------------------------------------------------------------------
-- 1. hrm_claim_type — per-org reimbursable claim catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "hrm_claim_type" (
  "id"                       text        PRIMARY KEY,
  "organizationId"           text        NOT NULL,
  "code"                     text        NOT NULL,
  "name"                     text        NOT NULL,
  "description"              text,
  "defaultPayrollLineCode"   text        NOT NULL DEFAULT 'ALLOWANCE_CLAIM',
  "currency"                 text        NOT NULL DEFAULT 'MYR',
  "perClaimLimit"            numeric(15, 2),
  "requiresEvidence"         boolean     NOT NULL DEFAULT true,
  "isActive"                 boolean     NOT NULL DEFAULT true,
  "createdAt"                timestamp   NOT NULL DEFAULT now(),
  "updatedAt"                timestamp   NOT NULL DEFAULT now(),
  "createdByUserId"          text,
  "updatedByUserId"          text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_claim_type_org_code_uidx"
  ON "hrm_claim_type"("organizationId", "code");
--> statement-breakpoint
CREATE INDEX "hrm_claim_type_org_active_idx"
  ON "hrm_claim_type"("organizationId", "isActive");
--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 2. hrm_claim — claim row (state machine)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "hrm_claim" (
  "id"                       text        PRIMARY KEY,
  "organizationId"           text        NOT NULL,
  "employeeId"               text        NOT NULL
                                          REFERENCES "hrm_employee"("id") ON DELETE RESTRICT,
  "claimTypeId"              text        NOT NULL
                                          REFERENCES "hrm_claim_type"("id") ON DELETE RESTRICT,
  "claimDate"                date        NOT NULL,
  "amount"                   numeric(15, 2) NOT NULL,
  "currency"                 text        NOT NULL DEFAULT 'MYR',
  "description"              text,
  "state"                    text        NOT NULL DEFAULT 'draft',
  "submittedAt"              timestamp,
  "currentApprovalId"        text        REFERENCES "hrm_approval"("id") ON DELETE SET NULL,
  "decidedByUserId"          text,
  "decidedAt"                timestamp,
  "rejectedReason"           text,
  "paidByPayrollLineId"      text,
  "paidAt"                   timestamp,
  "cancelledAt"              timestamp,
  "cancelledReason"          text,
  "policyVersion"            text,
  "temporalPast"             jsonb,
  "temporalNow"              jsonb,
  "temporalNext"             jsonb,
  "audit7w1h"                jsonb,
  "auditOrigin"              text        NOT NULL DEFAULT 'production',
  "createdAt"                timestamp   NOT NULL DEFAULT now(),
  "updatedAt"                timestamp   NOT NULL DEFAULT now(),
  "createdByUserId"          text,
  "updatedByUserId"          text
);
--> statement-breakpoint
CREATE INDEX "hrm_claim_org_employee_state_idx"
  ON "hrm_claim"("organizationId", "employeeId", "state");
--> statement-breakpoint
CREATE INDEX "hrm_claim_org_state_claim_date_idx"
  ON "hrm_claim"("organizationId", "state", "claimDate");
--> statement-breakpoint
CREATE INDEX "hrm_claim_org_paid_line_idx"
  ON "hrm_claim"("organizationId", "paidByPayrollLineId");
--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 3. hrm_claim_evidence — claim ↔ hrm_document linkage
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "hrm_claim_evidence" (
  "id"                       text        PRIMARY KEY,
  "organizationId"           text        NOT NULL,
  "claimId"                  text        NOT NULL
                                          REFERENCES "hrm_claim"("id") ON DELETE CASCADE,
  "documentId"               text        NOT NULL
                                          REFERENCES "hrm_document"("id") ON DELETE RESTRICT,
  "evidenceType"             text        NOT NULL DEFAULT 'receipt',
  "notes"                    text,
  "uploadedByUserId"         text,
  "uploadedAt"               timestamp   NOT NULL DEFAULT now(),
  "createdAt"                timestamp   NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_claim_evidence_claim_document_uidx"
  ON "hrm_claim_evidence"("claimId", "documentId");
--> statement-breakpoint
CREATE INDEX "hrm_claim_evidence_org_claim_idx"
  ON "hrm_claim_evidence"("organizationId", "claimId");
--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 4. hrm_payroll_line.claimId — payroll-line ↔ claim bridge
-- ---------------------------------------------------------------------------

ALTER TABLE "hrm_payroll_line"
  ADD COLUMN IF NOT EXISTS "claimId" text;
--> statement-breakpoint
ALTER TABLE "hrm_payroll_line"
  ADD CONSTRAINT "hrm_payroll_line_claim_id_fk"
  FOREIGN KEY ("claimId") REFERENCES "hrm_claim"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hrm_payroll_line_claim_id_idx"
  ON "hrm_payroll_line"("claimId");
--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 5. hrm_benefit (STUB) — per-org benefit catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "hrm_benefit" (
  "id"                       text        PRIMARY KEY,
  "organizationId"           text        NOT NULL,
  "code"                     text        NOT NULL,
  "name"                     text        NOT NULL,
  "description"              text,
  "benefitKind"              text        NOT NULL DEFAULT 'other',
  "isActive"                 boolean     NOT NULL DEFAULT true,
  "createdAt"                timestamp   NOT NULL DEFAULT now(),
  "updatedAt"                timestamp   NOT NULL DEFAULT now(),
  "createdByUserId"          text,
  "updatedByUserId"          text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_org_code_uidx"
  ON "hrm_benefit"("organizationId", "code");
--> statement-breakpoint
CREATE INDEX "hrm_benefit_org_active_idx"
  ON "hrm_benefit"("organizationId", "isActive");
--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- 6. hrm_benefit_enrollment (STUB) — employee ↔ benefit
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "hrm_benefit_enrollment" (
  "id"                       text        PRIMARY KEY,
  "organizationId"           text        NOT NULL,
  "benefitId"                text        NOT NULL
                                          REFERENCES "hrm_benefit"("id") ON DELETE RESTRICT,
  "employeeId"               text        NOT NULL
                                          REFERENCES "hrm_employee"("id") ON DELETE RESTRICT,
  "enrolledAt"               timestamp   NOT NULL DEFAULT now(),
  "terminatedAt"             timestamp,
  "terminationReason"        text,
  "createdAt"                timestamp   NOT NULL DEFAULT now(),
  "updatedAt"                timestamp   NOT NULL DEFAULT now(),
  "createdByUserId"          text,
  "updatedByUserId"          text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hrm_benefit_enrollment_org_benefit_employee_uidx"
  ON "hrm_benefit_enrollment"("organizationId", "benefitId", "employeeId");
--> statement-breakpoint
CREATE INDEX "hrm_benefit_enrollment_org_employee_idx"
  ON "hrm_benefit_enrollment"("organizationId", "employeeId");
