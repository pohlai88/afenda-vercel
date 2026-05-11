-- Phase 2A: Leave type catalog, effective-dated org policy, and computed annual entitlement.
-- Follows the same column-naming convention as existing hrm_* tables (camelCase SQL columns).
-- Engine: lib/features/hrm/data/leave-entitlement-engine.server.ts
-- Seed:   lib/features/hrm/data/leave-rules/my-ea-2023-01.ts
-- Actions: lib/features/hrm/actions/leave-policy.actions.ts
-- -------------------------------------------------------------------------

CREATE TABLE "hrm_leave_type" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  -- e.g. ANNUAL | SICK | HOSPITAL | MATERNITY | PATERNITY
  "code" text NOT NULL,
  -- annual_grant | monthly_accrual | fixed_grant
  "accrualMethod" text NOT NULL DEFAULT 'annual_grant',
  "paid" boolean NOT NULL DEFAULT true,
  -- NULL | 'male' | 'female'
  "genderRestriction" text,
  -- EA-style service-seniority tiers (tier1 = lowest threshold, tier3 = highest)
  "tier1Days" integer,
  "tier1MaxYears" integer,    -- exclusive upper bound (2 → "< 2 years")
  "tier2Days" integer,
  "tier2MaxYears" integer,    -- exclusive upper bound (5 → "2 – <5 years")
  "tier3Days" integer,        -- for ≥ tier2MaxYears (no further threshold needed for 3-tier EA)
  -- Fixed entitlement for non-tiered leave types (hospital, maternity, paternity)
  "fixedDaysPerYear" integer,
  "maxCarryForwardDays" integer NOT NULL DEFAULT 0,
  "carryForwardExpiryMonths" integer,
  "archivedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE UNIQUE INDEX "hrm_leave_type_org_code_uidx"
  ON "hrm_leave_type" ("organizationId", "code");
--> statement-breakpoint

CREATE INDEX "hrm_leave_type_org_archivedAt_idx"
  ON "hrm_leave_type" ("organizationId", "archivedAt");
--> statement-breakpoint

-- Effective-dated policy overlay for an org's leave type.
-- The policyVersion column is snapshotted onto hrm_leave_entitlement so future
-- changes do not silently mutate past entitlement records.
CREATE TABLE "hrm_leave_policy" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "leaveTypeId" text NOT NULL
    REFERENCES "hrm_leave_type"("id") ON DELETE RESTRICT,
  "effectiveFrom" date NOT NULL,
  "effectiveTo" date,
  "isActive" boolean NOT NULL DEFAULT true,
  -- Override the leave type's EA tier values for this org (NULL = use leave type default)
  "overrideTier1Days" integer,
  "overrideTier2Days" integer,
  "overrideTier3Days" integer,
  "overrideFixedDays" integer,
  "overrideMaxCarryForward" integer,
  "notes" text,
  -- Human-readable version tag for audit snapshot (e.g. "MY-EA-2023-01", "custom")
  "policyVersion" text NOT NULL DEFAULT 'custom',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdByUserId" text,
  "updatedByUserId" text
);
--> statement-breakpoint

CREATE INDEX "hrm_leave_policy_org_leaveTypeId_idx"
  ON "hrm_leave_policy" ("organizationId", "leaveTypeId");
--> statement-breakpoint

CREATE INDEX "hrm_leave_policy_org_effectiveFrom_idx"
  ON "hrm_leave_policy" ("organizationId", "effectiveFrom");
--> statement-breakpoint

-- Computed annual entitlement per employee per leave type.
-- Written by leave-entitlement-engine; read by leave request actions.
-- Unique per (org, employee, leave type, year) so the engine can upsert safely.
CREATE TABLE "hrm_leave_entitlement" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organizationId" text NOT NULL,
  "employeeId" text NOT NULL
    REFERENCES "hrm_employee"("id") ON DELETE RESTRICT,
  "leaveTypeId" text NOT NULL
    REFERENCES "hrm_leave_type"("id") ON DELETE RESTRICT,
  -- NULL after leave type is deleted (soft-deleted case); entitlement record preserved
  "leavePolicyId" text
    REFERENCES "hrm_leave_policy"("id") ON DELETE SET NULL,
  "entitlementYear" integer NOT NULL,
  -- Full entitlement before pro-rata (based on service tier)
  "daysGranted" numeric(6, 2) NOT NULL,
  -- Entitlement after pro-rata adjustment (what the employee actually accrues)
  "daysProrated" numeric(6, 2) NOT NULL,
  -- Complete years of service as of Jan 1 of the entitlement year
  "yearsOfServiceAtGrant" numeric(5, 2),
  -- Pro-rata fraction: prorataNumerator / prorataDenominator (e.g. 9/12)
  "prorataNumerator" integer NOT NULL DEFAULT 12,
  "prorataDenominator" integer NOT NULL DEFAULT 12,
  -- annual_grant | monthly_accrual | fixed_grant | prorated_grant
  "basis" text NOT NULL,
  -- Version of the engine + rules used (e.g. "MY-EA-2023-01")
  "engineVersion" text NOT NULL,
  -- Immutable snapshot of engine inputs for traceability
  "engineInputSnapshot" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX "hrm_leave_entitlement_org_employee_type_year_uidx"
  ON "hrm_leave_entitlement" ("organizationId", "employeeId", "leaveTypeId", "entitlementYear");
--> statement-breakpoint

CREATE INDEX "hrm_leave_entitlement_org_employee_idx"
  ON "hrm_leave_entitlement" ("organizationId", "employeeId");
--> statement-breakpoint

CREATE INDEX "hrm_leave_entitlement_org_year_idx"
  ON "hrm_leave_entitlement" ("organizationId", "entitlementYear");
