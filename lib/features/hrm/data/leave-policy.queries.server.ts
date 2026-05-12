import "server-only"

import { and, asc, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmLeavePolicy, hrmLeaveType } from "#lib/db/schema"

// ---------------------------------------------------------------------------
// Org-scoped read surface for the HR Policies workbench (PR #4 — §6.11
// "Policy / rule configuration"). The Phase 2A action layer
// (`createLeaveTypeAction`, `updateLeaveTypeAction`,
// `seedMalaysiaEa2023LeaveTypesAction`, `createLeavePolicyAction`)
// already enforces `requireHrmAdmin` on every mutation; these reads
// are member-safe (Tier B) but always tenant-scoped.
//
// Library-style queries (one row per logical concern):
//   - listAllLeaveTypesForOrg → both active and archived, newest update first
//   - getLeaveTypeById         → identity check + edit form prefill
//   - listLeavePoliciesForOrg  → effective-dated overlay rows for the
//                                policy timeline / future Phase 4 history
// ---------------------------------------------------------------------------

/**
 * Decorated `hrm_leave_type` row used by the Policies workbench. Adds
 * the `archivedAt` flag (the Phase 2A `LeaveTypeChoiceRow` shape
 * filters archived rows out — Policies needs both buckets).
 */
export type LeaveTypeAdminRow = {
  readonly id: string
  readonly code: string
  readonly accrualMethod: string
  readonly paid: boolean
  readonly genderRestriction: string | null
  readonly tier1Days: number | null
  readonly tier1MaxYears: number | null
  readonly tier2Days: number | null
  readonly tier2MaxYears: number | null
  readonly tier3Days: number | null
  readonly fixedDaysPerYear: number | null
  readonly maxCarryForwardDays: number
  readonly carryForwardExpiryMonths: number | null
  readonly archivedAt: Date | null
  readonly updatedAt: Date
  readonly createdAt: Date
}

/**
 * `hrm_leave_policy` row decorated with the parent leave-type code so
 * the timeline / inspector renders without a second query. `effectiveTo`
 * is `null` for the open-ended overlay; `isActive=false` distinguishes a
 * draft / retired overlay from a live one.
 */
export type LeavePolicyAdminRow = {
  readonly id: string
  readonly leaveTypeId: string
  readonly leaveTypeCode: string
  readonly effectiveFrom: Date
  readonly effectiveTo: Date | null
  readonly isActive: boolean
  readonly overrideTier1Days: number | null
  readonly overrideTier2Days: number | null
  readonly overrideTier3Days: number | null
  readonly overrideFixedDays: number | null
  readonly overrideMaxCarryForward: number | null
  readonly notes: string | null
  readonly policyVersion: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * All leave types for one org — both active and archived — most-recently
 * updated first. The Policies workbench renders archived rows behind a
 * URL-driven "include archived" toggle; the row cap stays generous (200)
 * because leave-type catalogs are intentionally tiny by design.
 */
export async function listAllLeaveTypesForOrg(
  organizationId: string
): Promise<LeaveTypeAdminRow[]> {
  return db
    .select({
      id: hrmLeaveType.id,
      code: hrmLeaveType.code,
      accrualMethod: hrmLeaveType.accrualMethod,
      paid: hrmLeaveType.paid,
      genderRestriction: hrmLeaveType.genderRestriction,
      tier1Days: hrmLeaveType.tier1Days,
      tier1MaxYears: hrmLeaveType.tier1MaxYears,
      tier2Days: hrmLeaveType.tier2Days,
      tier2MaxYears: hrmLeaveType.tier2MaxYears,
      tier3Days: hrmLeaveType.tier3Days,
      fixedDaysPerYear: hrmLeaveType.fixedDaysPerYear,
      maxCarryForwardDays: hrmLeaveType.maxCarryForwardDays,
      carryForwardExpiryMonths: hrmLeaveType.carryForwardExpiryMonths,
      archivedAt: hrmLeaveType.archivedAt,
      updatedAt: hrmLeaveType.updatedAt,
      createdAt: hrmLeaveType.createdAt,
    })
    .from(hrmLeaveType)
    .where(eq(hrmLeaveType.organizationId, organizationId))
    .orderBy(desc(hrmLeaveType.updatedAt))
    .limit(200)
}

/**
 * Single leave type lookup tightly scoped to one org so the edit form
 * cannot be coerced into rendering another tenant's row by passing a
 * leaked id through `?leaveTypeId=…`. Returns `null` when the row is
 * missing or owned by a different organization.
 */
export async function getLeaveTypeForOrg(
  organizationId: string,
  leaveTypeId: string
): Promise<LeaveTypeAdminRow | null> {
  const row = await db
    .select({
      id: hrmLeaveType.id,
      code: hrmLeaveType.code,
      accrualMethod: hrmLeaveType.accrualMethod,
      paid: hrmLeaveType.paid,
      genderRestriction: hrmLeaveType.genderRestriction,
      tier1Days: hrmLeaveType.tier1Days,
      tier1MaxYears: hrmLeaveType.tier1MaxYears,
      tier2Days: hrmLeaveType.tier2Days,
      tier2MaxYears: hrmLeaveType.tier2MaxYears,
      tier3Days: hrmLeaveType.tier3Days,
      fixedDaysPerYear: hrmLeaveType.fixedDaysPerYear,
      maxCarryForwardDays: hrmLeaveType.maxCarryForwardDays,
      carryForwardExpiryMonths: hrmLeaveType.carryForwardExpiryMonths,
      archivedAt: hrmLeaveType.archivedAt,
      updatedAt: hrmLeaveType.updatedAt,
      createdAt: hrmLeaveType.createdAt,
    })
    .from(hrmLeaveType)
    .where(
      and(
        eq(hrmLeaveType.organizationId, organizationId),
        eq(hrmLeaveType.id, leaveTypeId)
      )
    )
    .limit(1)
  return row[0] ?? null
}

export type ListLeavePoliciesForOrgOptions = {
  readonly leaveTypeId?: string
  readonly limit?: number
}

/**
 * Effective-dated policy overlays for one org. Joined with
 * `hrm_leave_type` so the timeline renders the parent code without a
 * second round trip. Sorted by `effectiveFrom` descending so the
 * newest overlay sits at the top of the timeline. Optional
 * `leaveTypeId` filter scopes the result to one parent type for the
 * leave-type detail drawer.
 */
export async function listLeavePoliciesForOrg(
  organizationId: string,
  options: ListLeavePoliciesForOrgOptions = {}
): Promise<LeavePolicyAdminRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500)

  const predicates = [eq(hrmLeavePolicy.organizationId, organizationId)]
  if (options.leaveTypeId) {
    predicates.push(eq(hrmLeavePolicy.leaveTypeId, options.leaveTypeId))
  }

  const rows = await db
    .select({
      id: hrmLeavePolicy.id,
      leaveTypeId: hrmLeavePolicy.leaveTypeId,
      leaveTypeCode: hrmLeaveType.code,
      effectiveFrom: hrmLeavePolicy.effectiveFrom,
      effectiveTo: hrmLeavePolicy.effectiveTo,
      isActive: hrmLeavePolicy.isActive,
      overrideTier1Days: hrmLeavePolicy.overrideTier1Days,
      overrideTier2Days: hrmLeavePolicy.overrideTier2Days,
      overrideTier3Days: hrmLeavePolicy.overrideTier3Days,
      overrideFixedDays: hrmLeavePolicy.overrideFixedDays,
      overrideMaxCarryForward: hrmLeavePolicy.overrideMaxCarryForward,
      notes: hrmLeavePolicy.notes,
      policyVersion: hrmLeavePolicy.policyVersion,
      createdAt: hrmLeavePolicy.createdAt,
      updatedAt: hrmLeavePolicy.updatedAt,
    })
    .from(hrmLeavePolicy)
    .innerJoin(
      hrmLeaveType,
      and(
        eq(hrmLeavePolicy.leaveTypeId, hrmLeaveType.id),
        eq(hrmLeaveType.organizationId, organizationId)
      )
    )
    .where(and(...predicates))
    .orderBy(desc(hrmLeavePolicy.effectiveFrom), asc(hrmLeaveType.code))
    .limit(limit)

  return rows
}
