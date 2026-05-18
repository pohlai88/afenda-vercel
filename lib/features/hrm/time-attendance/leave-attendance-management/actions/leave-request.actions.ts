"use server"

import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmLeaveBalance, hrmLeaveType } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { computeCarryForwardExpiry } from "../data/leave-absence.shared"
import { recomputeLeaveBalance } from "../data/leave-balance.server"
import {
  cancelLeaveRequestForContext,
  submitLeaveRequest,
} from "../data/leave-request-commands.server"
import {
  findLeaveEmployeeForUser,
  getLeaveEmployeeForOrg,
  getLeaveTypeForRequest,
} from "../data/leave-request.queries.server"
import {
  adjustLeaveBalanceFormSchema,
  applyLeaveFormSchema,
  cancelLeaveFormSchema,
  requestOwnLeaveFormSchema,
  runLeaveCarryForwardFormSchema,
} from "../schemas/leave-request.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  LeaveBalanceAdjustmentFormState,
  LeaveCarryForwardFormState,
  CancelLeaveFormState,
  LeaveRequestMutationFormState,
} from "../../../types"

function revalidateLeaveRequests() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/leave"), "layout")
}

// ---------------------------------------------------------------------------
// Tier B — request own leave / apply leave on behalf
// ---------------------------------------------------------------------------

export async function requestOwnLeaveAction(
  _prev: LeaveRequestMutationFormState | undefined,
  formData: FormData
): Promise<LeaveRequestMutationFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const employee = await findLeaveEmployeeForUser(organizationId, userId)
  if (!employee) {
    return hrmActionFailure({
      form: "Your user is not linked to an active employee record in this organization.",
    })
  }

  const parsed = requestOwnLeaveFormSchema.safeParse({
    leaveTypeId: formData.get("leaveTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    durationDays: formData.get("durationDays") || undefined,
    halfDay: formData.get("halfDay") ?? "none",
    reason: formData.get("reason") || null,
    evidenceDocumentId: formData.get("evidenceDocumentId") || null,
    policyVersion: formData.get("policyVersion") || null,
    durationOverrideReason: null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      leaveTypeId: errs.leaveTypeId?.[0],
      startDate: errs.startDate?.[0],
      endDate: errs.endDate?.[0],
      durationDays: errs.durationDays?.[0],
      durationOverrideReason: errs.durationOverrideReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed
  return submitLeaveRequest({
    organizationId,
    userId,
    sessionId,
    employeeId: employee.id,
    leaveTypeId: data.leaveTypeId,
    startDate: data.startDate,
    endDate: data.endDate,
    halfDay: data.halfDay,
    reason: data.reason,
    evidenceDocumentId: data.evidenceDocumentId,
    policyVersion: data.policyVersion,
    submissionMode: "self_service",
  })
}

/**
 * Tier B (leave-admin gated) — submits a leave request for an employee.
 * Creates: hrm_leave_request (state=submitted) + hrm_approval (state=pending).
 * Validates: balance sufficiency, date overlap, employee/leaveType ownership.
 * Audit: `erp.hrm.leave.request.create` + `erp.hrm.approval.request`
 */
export async function applyLeaveOnBehalfAction(
  _prev: LeaveRequestMutationFormState | undefined,
  formData: FormData
): Promise<LeaveRequestMutationFormState> {
  const gate = await requireHrmPermission({
    object: "leave",
    function: "update",
    errorMessage: "HRM leave permission required for this operation.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = applyLeaveFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    leaveTypeId: formData.get("leaveTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    durationDays: formData.get("durationDays") || undefined,
    halfDay: formData.get("halfDay") ?? "none",
    reason: formData.get("reason") || null,
    evidenceDocumentId: formData.get("evidenceDocumentId") || null,
    policyVersion: formData.get("policyVersion") || null,
    durationOverrideReason: formData.get("durationOverrideReason") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: errs.employeeId?.[0],
      leaveTypeId: errs.leaveTypeId?.[0],
      startDate: errs.startDate?.[0],
      endDate: errs.endDate?.[0],
      durationDays: errs.durationDays?.[0],
      durationOverrideReason: errs.durationOverrideReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed
  return submitLeaveRequest({
    organizationId,
    userId,
    sessionId,
    employeeId: data.employeeId,
    leaveTypeId: data.leaveTypeId,
    startDate: data.startDate,
    endDate: data.endDate,
    halfDay: data.halfDay,
    reason: data.reason,
    evidenceDocumentId: data.evidenceDocumentId,
    policyVersion: data.policyVersion,
    durationOverrideDays: data.durationDays,
    durationOverrideReason: data.durationOverrideReason,
    submissionMode: "on_behalf",
  })
}

export async function applyLeaveAction(
  prev: LeaveRequestMutationFormState | undefined,
  formData: FormData
): Promise<LeaveRequestMutationFormState> {
  return applyLeaveOnBehalfAction(prev, formData)
}

// ---------------------------------------------------------------------------
// Tier B — cancel leave request
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — cancels a submitted or approved leave request.
 * Transitions: submitted|approved → cancelled; pending approval → cancelled.
 * Audit: `erp.hrm.leave.request.cancel` (+ `erp.hrm.approval.cancel` if pending)
 */
export async function cancelLeaveAction(
  _prev: CancelLeaveFormState | undefined,
  formData: FormData
): Promise<CancelLeaveFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = cancelLeaveFormSchema.safeParse({
    requestId: formData.get("requestId"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      requestId: parsed.error.issues[0]?.message,
    })
  }

  return cancelLeaveRequestForContext({
    mode: "workbench",
    organizationId,
    userId,
    sessionId,
    requestId: parsed.data.requestId,
  })
}

// ---------------------------------------------------------------------------
// Tier B — leave balance operations
// ---------------------------------------------------------------------------

export async function adjustLeaveBalanceAction(
  _prev: LeaveBalanceAdjustmentFormState | undefined,
  formData: FormData
): Promise<LeaveBalanceAdjustmentFormState> {
  const gate = await requireHrmPermission({
    object: "leave",
    function: "update",
    errorMessage: "HRM leave permission required for balance adjustments.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = adjustLeaveBalanceFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    leaveTypeId: formData.get("leaveTypeId"),
    entitlementYear: formData.get("entitlementYear"),
    adjustmentKind: formData.get("adjustmentKind"),
    days: formData.get("days"),
    reason: formData.get("reason"),
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: errs.employeeId?.[0],
      leaveTypeId: errs.leaveTypeId?.[0],
      entitlementYear: errs.entitlementYear?.[0],
      adjustmentKind: errs.adjustmentKind?.[0],
      days: errs.days?.[0],
      reason: errs.reason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed
  const [employee, leaveType] = await Promise.all([
    getLeaveEmployeeForOrg(organizationId, data.employeeId),
    getLeaveTypeForRequest(organizationId, data.leaveTypeId),
  ])

  if (!employee) return hrmActionFailure({ employeeId: "Employee not found." })
  if (employee.archivedAt) {
    return hrmActionFailure({
      employeeId: "Cannot adjust leave for an archived employee.",
    })
  }
  if (!leaveType) {
    return hrmActionFailure({ leaveTypeId: "Leave type not found." })
  }
  if (leaveType.archivedAt) {
    return hrmActionFailure({ leaveTypeId: "Leave type is archived." })
  }

  await recomputeLeaveBalance(
    organizationId,
    data.employeeId,
    data.leaveTypeId,
    data.entitlementYear
  )

  const existing = await db.query.hrmLeaveBalance.findFirst({
    where: and(
      eq(hrmLeaveBalance.organizationId, organizationId),
      eq(hrmLeaveBalance.employeeId, data.employeeId),
      eq(hrmLeaveBalance.leaveTypeId, data.leaveTypeId),
      eq(hrmLeaveBalance.entitlementYear, data.entitlementYear)
    ),
    columns: {
      id: true,
      openingDays: true,
      adjustedDays: true,
      carriedForwardDays: true,
    },
  })

  if (!existing) {
    return hrmActionFailure({
      form: "Unable to initialize leave balance for adjustment.",
    })
  }

  const now = new Date()
  const next = nextBalanceAdjustmentValues({
    kind: data.adjustmentKind,
    days: data.days,
    openingDays: Number(existing.openingDays),
    adjustedDays: Number(existing.adjustedDays),
    carriedForwardDays: Number(existing.carriedForwardDays),
  })

  await db
    .update(hrmLeaveBalance)
    .set({
      openingDays: String(next.openingDays),
      adjustedDays: String(next.adjustedDays),
      carriedForwardDays: String(next.carriedForwardDays),
      updatedAt: now,
      lastRecomputedAt: now,
    })
    .where(eq(hrmLeaveBalance.id, existing.id))

  await recomputeLeaveBalance(
    organizationId,
    data.employeeId,
    data.leaveTypeId,
    data.entitlementYear
  )

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.leave.balance.adjust",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_balance",
    resourceId: existing.id,
    metadata: {
      employeeId: data.employeeId,
      leaveTypeCode: leaveType.code,
      entitlementYear: data.entitlementYear,
      adjustmentKind: data.adjustmentKind,
      days: data.days,
      reason: data.reason,
    },
  })

  revalidateLeaveRequests()
  return { ok: true, balanceId: existing.id }
}

export async function runLeaveCarryForwardAction(
  _prev: LeaveCarryForwardFormState | undefined,
  formData: FormData
): Promise<LeaveCarryForwardFormState> {
  const gate = await requireHrmPermission({
    object: "leave",
    function: "update",
    errorMessage: "HRM leave permission required for carry-forward.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = runLeaveCarryForwardFormSchema.safeParse({
    fromYear: formData.get("fromYear"),
    toYear: formData.get("toYear"),
    employeeId: formData.get("employeeId") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      fromYear: errs.fromYear?.[0],
      toYear: errs.toYear?.[0],
      employeeId: errs.employeeId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed
  const sourceBalances = await db.query.hrmLeaveBalance.findMany({
    where: and(
      eq(hrmLeaveBalance.organizationId, organizationId),
      eq(hrmLeaveBalance.entitlementYear, data.fromYear),
      data.employeeId
        ? eq(hrmLeaveBalance.employeeId, data.employeeId)
        : undefined
    ),
    columns: {
      id: true,
      employeeId: true,
      leaveTypeId: true,
      daysEntitled: true,
      daysTaken: true,
      daysPending: true,
      openingDays: true,
      adjustedDays: true,
      carriedForwardDays: true,
    },
  })

  if (sourceBalances.length === 0) {
    return { ok: true, processed: 0 }
  }

  const leaveTypes = await db.query.hrmLeaveType.findMany({
    where: and(
      eq(hrmLeaveType.organizationId, organizationId),
      inArray(hrmLeaveType.id, [
        ...new Set(sourceBalances.map((balance) => balance.leaveTypeId)),
      ])
    ),
    columns: {
      id: true,
      code: true,
      maxCarryForwardDays: true,
      carryForwardExpiryMonths: true,
    },
  })
  const leaveTypeMap = new Map(
    leaveTypes.map((leaveType) => [leaveType.id, leaveType])
  )
  let processed = 0

  for (const balance of sourceBalances) {
    const leaveType = leaveTypeMap.get(balance.leaveTypeId)
    if (!leaveType || leaveType.maxCarryForwardDays <= 0) continue

    const available =
      Number(balance.openingDays) +
      Number(balance.daysEntitled) +
      Number(balance.adjustedDays) +
      Number(balance.carriedForwardDays) -
      Number(balance.daysTaken) -
      Number(balance.daysPending)
    const carriedDays = Math.min(
      Math.max(available, 0),
      leaveType.maxCarryForwardDays
    )
    if (carriedDays <= 0) continue

    await recomputeLeaveBalance(
      organizationId,
      balance.employeeId,
      balance.leaveTypeId,
      data.toYear
    )

    const target = await db.query.hrmLeaveBalance.findFirst({
      where: and(
        eq(hrmLeaveBalance.organizationId, organizationId),
        eq(hrmLeaveBalance.employeeId, balance.employeeId),
        eq(hrmLeaveBalance.leaveTypeId, balance.leaveTypeId),
        eq(hrmLeaveBalance.entitlementYear, data.toYear)
      ),
      columns: { id: true },
    })

    if (!target) {
      return hrmActionFailure({
        form: "Unable to initialize carry-forward target balance.",
      })
    }

    const now = new Date()
    await db
      .update(hrmLeaveBalance)
      .set({
        carriedForwardDays: String(carriedDays),
        updatedAt: now,
        lastRecomputedAt: now,
      })
      .where(eq(hrmLeaveBalance.id, target.id))

    await recomputeLeaveBalance(
      organizationId,
      balance.employeeId,
      balance.leaveTypeId,
      data.toYear
    )

    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.leave.balance.carry_forward",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_leave_balance",
      resourceId: target.id,
      metadata: {
        employeeId: balance.employeeId,
        leaveTypeCode: leaveType.code,
        fromYear: data.fromYear,
        toYear: data.toYear,
        carriedDays,
        expiresAt: computeCarryForwardExpiry({
          entitlementYear: data.fromYear,
          expiryMonths: leaveType.carryForwardExpiryMonths,
        }),
      },
    })

    processed += 1
  }

  revalidateLeaveRequests()
  return { ok: true, processed }
}

function nextBalanceAdjustmentValues(input: {
  kind: string
  days: number
  openingDays: number
  adjustedDays: number
  carriedForwardDays: number
}): {
  openingDays: number
  adjustedDays: number
  carriedForwardDays: number
} {
  switch (input.kind) {
    case "opening_balance":
      return { ...input, openingDays: input.days }
    case "manual_correction":
      return { ...input, adjustedDays: input.adjustedDays + input.days }
    case "carry_forward":
      return {
        ...input,
        carriedForwardDays: input.carriedForwardDays + input.days,
      }
    case "expiry":
      return {
        ...input,
        carriedForwardDays: input.carriedForwardDays - input.days,
      }
    case "encashment_ready":
      return { ...input, adjustedDays: input.adjustedDays - input.days }
    default:
      throw new Error(
        `Unsupported leave balance adjustment kind: ${input.kind}`
      )
  }
}
