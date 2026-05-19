"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  createPlannerSignalLink,
  insertPlannerSignal,
} from "#features/orbit/server"
import { db } from "#lib/db"
import { hrmApproval } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"

import { organizationHrmPath } from "../../../constants"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { getPayrollPeriod } from "../data/payroll.queries.server"
import {
  PAYROLL_PERIOD_LOCK_SUBJECT_KIND,
  payrollLockApprovalDecisionSchema,
  payrollLockApprovalRequestSchema,
  payrollLockRejectDecisionSchema,
} from "../schemas/payroll-period.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { PayrollLockApprovalFormState } from "../../../types"

/**
 * Revalidates at **layout** scope so the HRM rail's `payroll` pressure
 * badge (Phase 2 — `getHrmRailPressureCounts`) refreshes after every
 * payroll-lock approval / rejection. The payroll page revalidation
 * comes along for free since it sits below the layout.
 */
function revalidatePayrollPages() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/payroll"), "layout")
}

/**
 * Creates a pending `hrm_approval` row so a second admin can certify payroll lock readiness.
 * Audit: `erp.hrm.approval.request`.
 */
export async function requestPayrollPeriodLockApprovalAction(
  _prev: PayrollLockApprovalFormState,
  formData: FormData
): Promise<PayrollLockApprovalFormState> {
  const gate = await requireHrmPermission({
    object: "payroll",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = payrollLockApprovalRequestSchema.safeParse({
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.flatten().fieldErrors.periodId?.[0],
    })
  }

  const period = await getPayrollPeriod(
    session.organizationId,
    parsed.data.periodId
  )
  if (!period) {
    return hrmActionFailure({ form: "Payroll period not found." })
  }
  if (period.state !== "preparing") {
    return hrmActionFailure({ form: "Period must be in preparing state." })
  }

  const pending = await db
    .select({ id: hrmApproval.id })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, session.organizationId),
        eq(hrmApproval.subjectKind, PAYROLL_PERIOD_LOCK_SUBJECT_KIND),
        eq(hrmApproval.subjectId, parsed.data.periodId),
        eq(hrmApproval.state, "pending")
      )
    )
    .limit(1)
  if (pending.length > 0) {
    return hrmActionFailure({
      form: "A lock approval request is already pending.",
    })
  }

  const approved = await db
    .select({ id: hrmApproval.id })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, session.organizationId),
        eq(hrmApproval.subjectKind, PAYROLL_PERIOD_LOCK_SUBJECT_KIND),
        eq(hrmApproval.subjectId, parsed.data.periodId),
        eq(hrmApproval.state, "approved")
      )
    )
    .limit(1)
  if (approved.length > 0) {
    return hrmActionFailure({
      form: "Lock approval already recorded — lock the period.",
    })
  }

  const approvalId = crypto.randomUUID()
  const now = new Date()

  await db.insert(hrmApproval).values({
    id: approvalId,
    organizationId: session.organizationId,
    subjectKind: PAYROLL_PERIOD_LOCK_SUBJECT_KIND,
    subjectId: parsed.data.periodId,
    state: "pending",
    requestedByUserId: session.userId,
    snapshot: {
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      paymentDate: period.paymentDate,
      currency: period.currency,
    },
    createdByUserId: session.userId,
    updatedByUserId: session.userId,
    createdAt: now,
    updatedAt: now,
  })

  const orgSlug = await getOrganizationSlugById(session.organizationId)
  const signal = await insertPlannerSignal({
    scope: {
      scopeKind: "organization",
      organizationId: session.organizationId,
    },
    title: `Payroll lock approval requested for ${period.periodEnd}`,
    description:
      "A second HRM administrator must review and approve payroll lock readiness.",
    signalClass: "review",
    actorUserId: session.userId,
    originatingSystem: "hrm.payroll",
    pressure: {
      urgency: 3,
      impact: 4,
      severity: 3,
      confidence: 4,
      effort: 2,
      escalationLevel: 2,
      temporalProximity: 3,
      ownershipPressure: 3,
    },
  })

  await createPlannerSignalLink({
    scope: {
      scopeKind: "organization",
      organizationId: session.organizationId,
    },
    signalId: signal.id,
    module: "hrm",
    entityType: "payroll_period",
    entityId: period.id,
    displayLabel: `Payroll period ${period.periodEnd}`,
    href: orgSlug ? organizationHrmPath(orgSlug, "payroll") : null,
    causalityReason: "Payroll period lock approval is pending.",
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.request",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_approval",
      resourceId: approvalId,
      metadata: {
        subjectKind: PAYROLL_PERIOD_LOCK_SUBJECT_KIND,
        subjectId: parsed.data.periodId,
      },
    })
  )

  revalidatePayrollPages()
  return { ok: true }
}

/**
 * Approves a payroll-period lock certification.
 * Audit: `erp.hrm.approval.approve`.
 */
export async function approvePayrollPeriodLockApprovalAction(
  _prev: PayrollLockApprovalFormState,
  formData: FormData
): Promise<PayrollLockApprovalFormState> {
  const gate = await requireHrmPermission({
    object: "payroll",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = payrollLockApprovalDecisionSchema.safeParse({
    approvalId: formData.get("approvalId"),
    decisionNote: formData.get("decisionNote") || null,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      approvalId: fe.approvalId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const rows = await db
    .select({
      id: hrmApproval.id,
      organizationId: hrmApproval.organizationId,
      subjectKind: hrmApproval.subjectKind,
      subjectId: hrmApproval.subjectId,
      state: hrmApproval.state,
      requestedByUserId: hrmApproval.requestedByUserId,
    })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, session.organizationId),
        eq(hrmApproval.id, parsed.data.approvalId)
      )
    )
    .limit(1)
  const row = rows[0]
  if (!row) {
    return hrmActionFailure({ form: "Approval record not found." })
  }
  if (row.subjectKind !== PAYROLL_PERIOD_LOCK_SUBJECT_KIND) {
    return hrmActionFailure({ form: "Not a payroll lock approval." })
  }
  if (row.state !== "pending") {
    return hrmActionFailure({
      form: `Approval is not pending (state: ${row.state}).`,
    })
  }
  if (row.requestedByUserId === session.userId) {
    return hrmActionFailure({
      form: "Requester cannot approve their own payroll lock certification.",
    })
  }

  const now = new Date()
  await db
    .update(hrmApproval)
    .set({
      state: "approved",
      decisionByUserId: session.userId,
      decisionAt: now,
      decisionNote: parsed.data.decisionNote ?? null,
      updatedAt: now,
      updatedByUserId: session.userId,
    })
    .where(eq(hrmApproval.id, parsed.data.approvalId))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.approve",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_approval",
      resourceId: parsed.data.approvalId,
      metadata: {
        subjectKind: PAYROLL_PERIOD_LOCK_SUBJECT_KIND,
        subjectId: row.subjectId,
      },
    })
  )

  revalidatePayrollPages()
  return { ok: true }
}

/**
 * Rejects a payroll-period lock certification so preparation can continue.
 * Audit: `erp.hrm.approval.reject`.
 */
export async function rejectPayrollPeriodLockApprovalAction(
  _prev: PayrollLockApprovalFormState,
  formData: FormData
): Promise<PayrollLockApprovalFormState> {
  const gate = await requireHrmPermission({
    object: "payroll",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = payrollLockRejectDecisionSchema.safeParse({
    approvalId: formData.get("approvalId"),
    rejectedReason: formData.get("rejectedReason"),
    decisionNote: formData.get("decisionNote") || null,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      approvalId: fe.approvalId?.[0],
      rejectedReason: fe.rejectedReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const rows = await db
    .select({
      id: hrmApproval.id,
      organizationId: hrmApproval.organizationId,
      subjectKind: hrmApproval.subjectKind,
      subjectId: hrmApproval.subjectId,
      state: hrmApproval.state,
    })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, session.organizationId),
        eq(hrmApproval.id, parsed.data.approvalId)
      )
    )
    .limit(1)
  const row = rows[0]
  if (!row) {
    return hrmActionFailure({ form: "Approval record not found." })
  }
  if (row.subjectKind !== PAYROLL_PERIOD_LOCK_SUBJECT_KIND) {
    return hrmActionFailure({ form: "Not a payroll lock approval." })
  }
  if (row.state !== "pending") {
    return hrmActionFailure({
      form: `Approval is not pending (state: ${row.state}).`,
    })
  }

  const now = new Date()
  const decisionNote = [parsed.data.rejectedReason, parsed.data.decisionNote]
    .filter(Boolean)
    .join(" — ")

  await db
    .update(hrmApproval)
    .set({
      state: "rejected",
      decisionByUserId: session.userId,
      decisionAt: now,
      decisionNote,
      updatedAt: now,
      updatedByUserId: session.userId,
    })
    .where(eq(hrmApproval.id, parsed.data.approvalId))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.reject",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "hrm_approval",
      resourceId: parsed.data.approvalId,
      metadata: {
        subjectKind: PAYROLL_PERIOD_LOCK_SUBJECT_KIND,
        subjectId: row.subjectId,
      },
    })
  )

  revalidatePayrollPages()
  return { ok: true }
}
