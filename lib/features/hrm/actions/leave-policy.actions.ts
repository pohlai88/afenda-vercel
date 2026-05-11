"use server"

import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canActInOrganization } from "#lib/auth/permission.server"
import { db } from "#lib/db"
import { hrmLeavePolicy, hrmLeaveType } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import {
  MY_EA_2023_LEAVE_TYPES,
  MY_EA_2023_POLICY_VERSION,
} from "../data/leave-rules/my-ea-2023-01"
import {
  createLeavePolicyFormSchema,
  createLeaveTypeFormSchema,
  updateLeaveTypeFormSchema,
} from "../schemas/leave-policy.schema"
import type {
  LeavePolicyMutationFormState,
  LeaveTypeMutationFormState,
  SeedLeaveTypesFormState,
} from "../types"

// ---------------------------------------------------------------------------
// Internal guard — admin role required
// ---------------------------------------------------------------------------

async function requireHrmAdmin() {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return {
      ok: false as const,
      error: "Admin role required to manage leave policies.",
    }
  }
  return { ok: true as const, session }
}

function revalidateLeave() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/leave"), "page")
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/policies"), "page")
}

// ---------------------------------------------------------------------------
// Tier B — create leave type (admin-gated master data)
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — creates a new leave type for the org.
 * Audit: `erp.hrm.leave_type.create`
 */
export async function createLeaveTypeAction(
  _prev: LeaveTypeMutationFormState | undefined,
  formData: FormData
): Promise<LeaveTypeMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = createLeaveTypeFormSchema.safeParse({
    code: formData.get("code"),
    accrualMethod: formData.get("accrualMethod"),
    paid: formData.get("paid") === "true",
    genderRestriction: formData.get("genderRestriction") || null,
    tier1Days: formData.get("tier1Days") || null,
    tier1MaxYears: formData.get("tier1MaxYears") || null,
    tier2Days: formData.get("tier2Days") || null,
    tier2MaxYears: formData.get("tier2MaxYears") || null,
    tier3Days: formData.get("tier3Days") || null,
    fixedDaysPerYear: formData.get("fixedDaysPerYear") || null,
    maxCarryForwardDays: formData.get("maxCarryForwardDays") ?? "0",
    carryForwardExpiryMonths: formData.get("carryForwardExpiryMonths") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        code: errs.code?.[0],
        accrualMethod: errs.accrualMethod?.[0],
        fixedDaysPerYear: errs.fixedDaysPerYear?.[0],
        tier1Days: errs.tier1Days?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  const { data } = parsed
  const id = crypto.randomUUID()

  try {
    await db.insert(hrmLeaveType).values({
      id,
      organizationId,
      code: data.code,
      accrualMethod: data.accrualMethod,
      paid: data.paid,
      genderRestriction: data.genderRestriction,
      tier1Days: data.tier1Days,
      tier1MaxYears: data.tier1MaxYears,
      tier2Days: data.tier2Days,
      tier2MaxYears: data.tier2MaxYears,
      tier3Days: data.tier3Days,
      fixedDaysPerYear: data.fixedDaysPerYear,
      maxCarryForwardDays: data.maxCarryForwardDays,
      carryForwardExpiryMonths: data.carryForwardExpiryMonths,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  } catch (err) {
    const isUniqueViolation =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    if (isUniqueViolation) {
      return {
        ok: false,
        errors: { code: `Leave type with code "${data.code}" already exists.` },
      }
    }
    return { ok: false, errors: { form: "Could not create leave type." } }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.leave_type.create",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_type",
    resourceId: id,
    metadata: { code: data.code, accrualMethod: data.accrualMethod },
  })

  revalidateLeave()
  return { ok: true, leaveTypeId: id }
}

// ---------------------------------------------------------------------------
// Tier B — update leave type
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — updates an existing leave type.
 * Audit: `erp.hrm.leave_type.update`
 */
export async function updateLeaveTypeAction(
  _prev: LeaveTypeMutationFormState | undefined,
  formData: FormData
): Promise<LeaveTypeMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = updateLeaveTypeFormSchema.safeParse({
    leaveTypeId: formData.get("leaveTypeId"),
    code: formData.get("code"),
    accrualMethod: formData.get("accrualMethod"),
    paid: formData.get("paid") === "true",
    genderRestriction: formData.get("genderRestriction") || null,
    tier1Days: formData.get("tier1Days") || null,
    tier1MaxYears: formData.get("tier1MaxYears") || null,
    tier2Days: formData.get("tier2Days") || null,
    tier2MaxYears: formData.get("tier2MaxYears") || null,
    tier3Days: formData.get("tier3Days") || null,
    fixedDaysPerYear: formData.get("fixedDaysPerYear") || null,
    maxCarryForwardDays: formData.get("maxCarryForwardDays") ?? "0",
    carryForwardExpiryMonths: formData.get("carryForwardExpiryMonths") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        leaveTypeId: errs.leaveTypeId?.[0],
        code: errs.code?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  const { data } = parsed

  const existing = await db.query.hrmLeaveType.findFirst({
    where: and(
      eq(hrmLeaveType.id, data.leaveTypeId),
      eq(hrmLeaveType.organizationId, organizationId)
    ),
    columns: { id: true },
  })

  if (!existing) {
    return { ok: false, errors: { leaveTypeId: "Leave type not found." } }
  }

  await db
    .update(hrmLeaveType)
    .set({
      code: data.code,
      accrualMethod: data.accrualMethod,
      paid: data.paid,
      genderRestriction: data.genderRestriction,
      tier1Days: data.tier1Days,
      tier1MaxYears: data.tier1MaxYears,
      tier2Days: data.tier2Days,
      tier2MaxYears: data.tier2MaxYears,
      tier3Days: data.tier3Days,
      fixedDaysPerYear: data.fixedDaysPerYear,
      maxCarryForwardDays: data.maxCarryForwardDays,
      carryForwardExpiryMonths: data.carryForwardExpiryMonths,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmLeaveType.id, data.leaveTypeId),
        eq(hrmLeaveType.organizationId, organizationId)
      )
    )

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.leave_type.update",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_type",
    resourceId: data.leaveTypeId,
    metadata: { code: data.code, accrualMethod: data.accrualMethod },
  })

  revalidateLeave()
  return { ok: true, leaveTypeId: data.leaveTypeId }
}

// ---------------------------------------------------------------------------
// Tier B — seed Malaysia EA 2023 leave types (admin-gated, idempotent)
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — idempotently upserts Malaysia EA 2023 default leave
 * types for the org. Safe to re-run: existing types by code are skipped.
 * Audit: `erp.hrm.leave_type.seed` per inserted type.
 */
export async function seedMalaysiaEa2023LeaveTypesAction(
  _prev: SeedLeaveTypesFormState | undefined,
  _formData: FormData
): Promise<SeedLeaveTypesFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const seeded: string[] = []
  const skipped: string[] = []

  for (const seed of MY_EA_2023_LEAVE_TYPES) {
    const existing = await db.query.hrmLeaveType.findFirst({
      where: and(
        eq(hrmLeaveType.organizationId, organizationId),
        eq(hrmLeaveType.code, seed.code)
      ),
      columns: { id: true },
    })

    if (existing) {
      skipped.push(seed.code)
      continue
    }

    const id = crypto.randomUUID()
    await db.insert(hrmLeaveType).values({
      id,
      organizationId,
      code: seed.code,
      accrualMethod: seed.accrualMethod,
      paid: seed.paid,
      genderRestriction: seed.genderRestriction,
      tier1Days: seed.tier1Days,
      tier1MaxYears: seed.tier1MaxYears,
      tier2Days: seed.tier2Days,
      tier2MaxYears: seed.tier2MaxYears,
      tier3Days: seed.tier3Days,
      fixedDaysPerYear: seed.fixedDaysPerYear,
      maxCarryForwardDays: seed.maxCarryForwardDays,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.leave_type.seed",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_leave_type",
      resourceId: id,
      metadata: {
        code: seed.code,
        policyVersion: MY_EA_2023_POLICY_VERSION,
      },
    })

    seeded.push(seed.code)
  }

  if (seeded.length > 0) {
    revalidateLeave()
  }

  return { ok: true, seeded, skipped }
}

// ---------------------------------------------------------------------------
// Tier B — create leave policy (effective-dated policy overlay)
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — creates an effective-dated policy overlay for a leave type.
 * Audit: `erp.hrm.policy.update`
 */
export async function createLeavePolicyAction(
  _prev: LeavePolicyMutationFormState | undefined,
  formData: FormData
): Promise<LeavePolicyMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = createLeavePolicyFormSchema.safeParse({
    leaveTypeId: formData.get("leaveTypeId"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo") || null,
    isActive: formData.get("isActive") !== "false",
    overrideTier1Days: formData.get("overrideTier1Days") || null,
    overrideTier2Days: formData.get("overrideTier2Days") || null,
    overrideTier3Days: formData.get("overrideTier3Days") || null,
    overrideFixedDays: formData.get("overrideFixedDays") || null,
    overrideMaxCarryForward: formData.get("overrideMaxCarryForward") || null,
    notes: formData.get("notes") || null,
    policyVersion: formData.get("policyVersion") || "custom",
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        leaveTypeId: errs.leaveTypeId?.[0],
        effectiveFrom: errs.effectiveFrom?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  const { data } = parsed

  const leaveTypeExists = await db.query.hrmLeaveType.findFirst({
    where: and(
      eq(hrmLeaveType.id, data.leaveTypeId),
      eq(hrmLeaveType.organizationId, organizationId)
    ),
    columns: { id: true },
  })

  if (!leaveTypeExists) {
    return { ok: false, errors: { leaveTypeId: "Leave type not found." } }
  }

  const id = crypto.randomUUID()

  await db.insert(hrmLeavePolicy).values({
    id,
    organizationId,
    leaveTypeId: data.leaveTypeId,
    effectiveFrom: data.effectiveFrom,
    effectiveTo: data.effectiveTo,
    isActive: data.isActive,
    overrideTier1Days: data.overrideTier1Days,
    overrideTier2Days: data.overrideTier2Days,
    overrideTier3Days: data.overrideTier3Days,
    overrideFixedDays: data.overrideFixedDays,
    overrideMaxCarryForward: data.overrideMaxCarryForward,
    notes: data.notes,
    policyVersion: data.policyVersion,
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.policy.update",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_policy",
    resourceId: id,
    metadata: {
      leaveTypeId: data.leaveTypeId,
      policyVersion: data.policyVersion,
      effectiveFrom: data.effectiveFrom.toISOString().slice(0, 10),
    },
  })

  revalidateLeave()
  return { ok: true, leavePolicyId: id }
}
