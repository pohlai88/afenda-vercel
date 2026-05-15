"use server"

import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmLeaveBalance,
  hrmLeaveRequest,
  hrmLeaveType,
} from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { toLocalePortalRevalidatePattern } from "#lib/portal"
import { requireOrgSession } from "#lib/tenant"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  buildLeaveRequestPolicySnapshot,
  computeCarryForwardExpiry,
  computeLeaveRequestDuration,
  validateLeavePolicyForRequest,
} from "../data/leave-absence.shared"
import {
  buildLeaveApprovalSnapshot,
  detectLeaveOverlap,
  listActiveLeaveRequestsForOverlapCheck,
  readLeaveBalance,
  recomputeLeaveBalance,
} from "../data/leave-balance.server"
import { resolveLeaveRequestCalendar } from "../data/leave-calendar.server"
import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import {
  findLeaveEmployeeForUser,
  getLeaveEmployeeForOrg,
  getLeaveTypeForRequest,
  resolveLeaveApproverUserId,
} from "../data/leave-request.queries.server"
import {
  adjustLeaveBalanceFormSchema,
  applyLeaveFormSchema,
  cancelLeaveFormSchema,
  requestOwnLeaveFormSchema,
  runLeaveCarryForwardFormSchema,
} from "../schemas/leave-request.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type {
  LeaveBalanceAdjustmentFormState,
  LeaveCarryForwardFormState,
  CancelLeaveFormState,
  LeaveRequestMutationFormState,
} from "../types"

/**
 * Revalidates at **layout** scope so the HRM rail's `leave` pressure
 * badge (Phase 2 — `getHrmRailPressureCounts`) refreshes after every
 * leave-request mutation. The leave page revalidation comes along for
 * free since it sits below the layout.
 */
function revalidateLeaveRequests() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/leave"), "layout")
}

function revalidatePortalEmployeeLeaveRequests() {
  revalidatePath(toLocalePortalRevalidatePattern("/employee/leave"), "page")
}

type SubmitLeaveRequestInput = {
  organizationId: string
  userId: string
  sessionId: string | null
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  halfDay: "none" | "morning" | "afternoon"
  reason: string | null
  evidenceDocumentId: string | null
  policyVersion: string | null
  durationOverrideDays?: number
  durationOverrideReason?: string | null
  portalSlug?: string | null
  submissionMode: "self_service" | "on_behalf"
}

type LeaveRequestFieldErrors = NonNullable<
  Extract<LeaveRequestMutationFormState, { ok: false }>["errors"]
>

async function submitLeaveRequest(
  input: SubmitLeaveRequestInput
): Promise<LeaveRequestMutationFormState> {
  const { organizationId, userId, sessionId } = input

  const [employee, leaveType] = await Promise.all([
    getLeaveEmployeeForOrg(organizationId, input.employeeId),
    getLeaveTypeForRequest(organizationId, input.leaveTypeId),
  ])

  if (!employee) return hrmActionFailure({ employeeId: "Employee not found." })
  if (employee.archivedAt) {
    return hrmActionFailure({
      employeeId: "Cannot submit leave for an archived employee.",
    })
  }
  if (!leaveType) {
    return hrmActionFailure({ leaveTypeId: "Leave type not found." })
  }
  if (leaveType.archivedAt) {
    return hrmActionFailure({ leaveTypeId: "Leave type is archived." })
  }

  const calendar = resolveLeaveRequestCalendar({
    countryCode: employee.countryCode,
    workStateCode: employee.workStateCode,
    startDate: input.startDate,
    endDate: input.endDate,
  })
  const computedDurationDays = computeLeaveRequestDuration({
    startDate: input.startDate,
    endDate: input.endDate,
    halfDay: input.halfDay,
    weekendDays: calendar.weekendDays,
    publicHolidayDates: calendar.publicHolidayDates,
  })
  const overrideReason = input.durationOverrideReason?.trim() || null
  const usesManualOverride =
    overrideReason !== null && input.durationOverrideDays !== undefined
  const durationDays = usesManualOverride
    ? (input.durationOverrideDays ?? computedDurationDays)
    : computedDurationDays

  if (durationDays <= 0) {
    return hrmActionFailure({
      startDate: "Leave range does not include a working day.",
    })
  }

  const entitlementYear = parseInt(input.startDate.slice(0, 4), 10)
  await recomputeLeaveBalance(
    organizationId,
    input.employeeId,
    input.leaveTypeId,
    entitlementYear
  )

  const currentBalance = await readLeaveBalance(
    organizationId,
    input.employeeId,
    input.leaveTypeId,
    entitlementYear
  )

  const policyValidation = validateLeavePolicyForRequest({
    startDate: input.startDate,
    endDate: input.endDate,
    durationDays,
    halfDay: input.halfDay,
    evidenceDocumentId: input.evidenceDocumentId,
    daysAvailable: currentBalance.daysAvailable,
    employeeGender: employee.gender,
    employeeStartDate: employee.employmentStartDate,
    genderRestriction: leaveType.genderRestriction,
    allowNegativeBalance: false,
  })

  if (!policyValidation.ok) {
    return hrmActionFailure(
      policyValidation.issues.reduce<LeaveRequestFieldErrors>(
        (acc, issue) => ({ ...acc, [issue.field]: issue.message }),
        { form: policyValidation.issues[0]?.message }
      )
    )
  }

  const existingRequests = await listActiveLeaveRequestsForOverlapCheck(
    organizationId,
    input.employeeId,
    input.leaveTypeId
  )

  const hasOverlap = detectLeaveOverlap(
    input.startDate,
    input.endDate,
    existingRequests
  )

  if (hasOverlap) {
    return hrmActionFailure({
      startDate: "Leave dates overlap with an existing active request.",
    })
  }

  const policySnapshot = buildLeaveRequestPolicySnapshot({
    startDate: input.startDate,
    endDate: input.endDate,
    durationDays,
    halfDay: input.halfDay,
    evidenceDocumentId: input.evidenceDocumentId,
    daysAvailable: currentBalance.daysAvailable,
    employeeGender: employee.gender,
    employeeStartDate: employee.employmentStartDate,
    genderRestriction: leaveType.genderRestriction,
    leaveTypeCode: leaveType.code,
    policyVersion: input.policyVersion,
    computedDurationDays,
    durationSource: usesManualOverride ? "manual_override" : "calendar",
    durationOverrideReason: overrideReason,
    allowNegativeBalance: false,
    weekendDays: calendar.weekendDays,
    publicHolidayDates: calendar.publicHolidayDates,
  })

  const approvalSnapshot = {
    ...buildLeaveApprovalSnapshot({
      employeeId: input.employeeId,
      employeeNumber: employee.employeeNumber,
      employeeFullName: employee.legalName,
      leaveTypeId: input.leaveTypeId,
      leaveTypeCode: leaveType.code,
      startDate: input.startDate,
      endDate: input.endDate,
      durationDays,
      halfDay: input.halfDay,
      reason: input.reason,
      balanceBefore: currentBalance,
      policyVersion: input.policyVersion,
      requestedAt: new Date(),
    }),
    policy: policySnapshot,
  }

  const currentApproverUserId = await resolveLeaveApproverUserId({
    organizationId,
    managerEmployeeId: employee.managerEmployeeId,
  })
  const requestId = crypto.randomUUID()
  const approvalId = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: "leave_request",
      subjectId: requestId,
      state: "pending",
      requestedByUserId: userId,
      currentApproverUserId,
      snapshot: approvalSnapshot,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await tx.insert(hrmLeaveRequest).values({
      id: requestId,
      organizationId,
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      durationDays: String(durationDays),
      halfDay: input.halfDay,
      reason: input.reason,
      evidenceDocumentId: input.evidenceDocumentId,
      state: "submitted",
      currentApprovalId: approvalId,
      policyVersion: input.policyVersion,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  })

  await recomputeLeaveBalance(
    organizationId,
    input.employeeId,
    input.leaveTypeId,
    entitlementYear
  )

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.leave.request.create",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_request",
    resourceId: requestId,
    metadata: {
      employeeId: input.employeeId,
      leaveTypeCode: leaveType.code,
      startDate: input.startDate,
      endDate: input.endDate,
      durationDays,
      computedDurationDays,
      durationSource: usesManualOverride ? "manual_override" : "calendar",
      submissionMode: input.submissionMode,
      currentApproverUserId,
      ...(input.portalSlug ? { portalSlug: input.portalSlug } : {}),
    },
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.request",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: {
      subjectKind: "leave_request",
      subjectId: requestId,
      currentApproverUserId,
    },
  })

  revalidateLeaveRequests()
  if (input.portalSlug) {
    revalidatePortalEmployeeLeaveRequests()
  }
  return { ok: true, requestId }
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

export async function requestPortalEmployeeLeaveAction(
  _prev: LeaveRequestMutationFormState | undefined,
  formData: FormData
): Promise<LeaveRequestMutationFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
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
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    employeeId: context.employee.id,
    leaveTypeId: data.leaveTypeId,
    startDate: data.startDate,
    endDate: data.endDate,
    halfDay: data.halfDay,
    reason: data.reason,
    evidenceDocumentId: data.evidenceDocumentId,
    policyVersion: data.policyVersion,
    portalSlug: context.portal.portalSlug,
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

type CancelLeaveRequestInput =
  | {
      mode: "workbench"
      organizationId: string
      userId: string
      sessionId: string | null
      requestId: string
    }
  | {
      mode: "employee_portal"
      organizationId: string
      userId: string
      sessionId: string | null
      employeeId: string
      portalSlug: string
      requestId: string
    }

async function cancelLeaveRequestForContext(
  input: CancelLeaveRequestInput
): Promise<CancelLeaveFormState> {
  const req = await db.query.hrmLeaveRequest.findFirst({
    where: and(
      eq(hrmLeaveRequest.id, input.requestId),
      eq(hrmLeaveRequest.organizationId, input.organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
      leaveTypeId: true,
      startDate: true,
      createdByUserId: true,
    },
  })

  if (!req) {
    return hrmActionFailure({ requestId: "Leave request not found." })
  }

  const CANCELLABLE_STATES = ["submitted", "approved"]
  if (!CANCELLABLE_STATES.includes(req.state)) {
    return hrmActionFailure({
      requestId: `Cannot cancel a leave request with state "${req.state}".`,
    })
  }

  if (input.mode === "employee_portal") {
    if (req.employeeId !== input.employeeId || req.state !== "submitted") {
      return hrmActionFailure({
        form: "You can cancel only your own pending leave requests.",
      })
    }
  } else {
    const [canManageLeave, employee] = await Promise.all([
      canUseErpPermission({
        organizationId: input.organizationId,
        userId: input.userId,
        permission: { module: "hrm", object: "leave", function: "update" },
      }),
      getLeaveEmployeeForOrg(input.organizationId, req.employeeId),
    ])

    const isOwnRequest =
      req.createdByUserId === input.userId ||
      employee?.linkedUserId === input.userId
    if (!canManageLeave && (!isOwnRequest || req.state !== "submitted")) {
      return hrmActionFailure({
        form: "You can cancel only your own pending leave requests.",
      })
    }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmLeaveRequest)
      .set({
        state: "cancelled",
        updatedAt: now,
        updatedByUserId: input.userId,
      })
      .where(eq(hrmLeaveRequest.id, input.requestId))

    if (req.currentApprovalId) {
      const approval = await tx.query.hrmApproval.findFirst({
        where: eq(hrmApproval.id, req.currentApprovalId),
        columns: { id: true, state: true },
      })
      if (approval?.state === "pending") {
        await tx
          .update(hrmApproval)
          .set({
            state: "cancelled",
            decisionByUserId: input.userId,
            decisionAt: now,
            decisionNote: "Leave request cancelled.",
            updatedAt: now,
            updatedByUserId: input.userId,
          })
          .where(eq(hrmApproval.id, req.currentApprovalId))
      }
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.leave.request.cancel",
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_leave_request",
    resourceId: input.requestId,
    metadata: {
      previousState: req.state,
      employeeId: req.employeeId,
      submissionMode:
        input.mode === "employee_portal" ? "self_service" : "workbench",
      ...(input.mode === "employee_portal"
        ? { portalSlug: input.portalSlug }
        : {}),
    },
  })

  if (req.currentApprovalId) {
    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.cancel",
      actorUserId: input.userId,
      actorSessionId: input.sessionId,
      organizationId: input.organizationId,
      resourceType: "hrm_approval",
      resourceId: req.currentApprovalId,
      metadata: {
        subjectKind: "leave_request",
        subjectId: input.requestId,
      },
    })
  }

  // Recompute balance (daysPending decreases)
  const entitlementYear = parseInt(req.startDate.slice(0, 4), 10)
  await recomputeLeaveBalance(
    input.organizationId,
    req.employeeId,
    req.leaveTypeId,
    entitlementYear
  )

  revalidateLeaveRequests()
  if (input.mode === "employee_portal") {
    revalidatePortalEmployeeLeaveRequests()
  }
  return { ok: true, requestId: input.requestId }
}

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

export async function cancelPortalEmployeeLeaveAction(
  _prev: CancelLeaveFormState | undefined,
  formData: FormData
): Promise<CancelLeaveFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const parsed = cancelLeaveFormSchema.safeParse({
    requestId: formData.get("requestId"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      requestId: parsed.error.issues[0]?.message,
    })
  }

  return cancelLeaveRequestForContext({
    mode: "employee_portal",
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    employeeId: context.employee.id,
    portalSlug: context.portal.portalSlug,
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
