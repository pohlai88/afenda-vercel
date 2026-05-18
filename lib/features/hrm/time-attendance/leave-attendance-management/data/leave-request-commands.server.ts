import "server-only"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmLeaveRequest } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import { toLocalePortalRevalidatePattern } from "#lib/portal"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  buildLeaveRequestPolicySnapshot,
  computeLeaveRequestDuration,
  validateLeavePolicyForRequest,
} from "./leave-absence.shared"
import {
  buildLeaveApprovalSnapshot,
  detectLeaveOverlap,
  listActiveLeaveRequestsForOverlapCheck,
  readLeaveBalance,
  recomputeLeaveBalance,
} from "./leave-balance.server"
import { resolveLeaveRequestCalendar } from "./leave-calendar.server"
import {
  getLeaveEmployeeForOrg,
  getLeaveTypeForRequest,
  resolveLeaveApproverUserId,
} from "./leave-request.queries.server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { withPortalMutationSpan } from "../../../employee-management/employee-selfservice-portal/data/portal-mutation-tracing.server"
import type {
  CancelLeaveFormState,
  LeaveRequestMutationFormState,
} from "../../../types"

/**
 * Revalidates at layout scope so the HRM rail's leave pressure badge refreshes
 * after every leave-request mutation.
 */
function revalidateLeaveRequests() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/leave"), "layout")
}

function revalidatePortalEmployeeLeaveRequests() {
  revalidatePath(toLocalePortalRevalidatePattern("/employee/leave"), "page")
}

export type SubmitLeaveRequestInput = {
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

export async function submitLeaveRequest(
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

export type CancelLeaveRequestInput =
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

export async function cancelLeaveRequestForContext(
  input: CancelLeaveRequestInput
): Promise<CancelLeaveFormState> {
  const run = async (): Promise<CancelLeaveFormState> =>
    cancelLeaveRequestForContextBody(input)
  if (input.mode === "employee_portal") {
    return withPortalMutationSpan(
      {
        spanName: "hrm.portal.leave.cancel",
        section: "leave",
        organizationId: input.organizationId,
        employeeId: input.employeeId,
      },
      run
    )
  }
  return run()
}

async function cancelLeaveRequestForContextBody(
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
