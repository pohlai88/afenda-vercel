import "server-only"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmOvertimeRequest } from "#lib/db/schema"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { OtmRequestMutationFormState } from "../../../types"
import {
  HRM_OTM_AUDIT,
  OTM_REQUEST_APPROVAL_SUBJECT_KIND,
} from "../otm.contract"
import { computeOvertimeDurationMinutes } from "./otm-display.shared"
import { buildOtmApprovalSnapshot } from "./otm-approval-snapshot.shared"
import { validateOtmEmployeeEligibility } from "./otm-eligibility.server"
import {
  countActiveOtmTypes,
  getOtmEmployeeForOrg,
  getOtmTypeForOrg,
  resolveOtmApproverUserId,
} from "./otm.queries.server"
import { hrmOtmDayCategorySchema } from "../schemas/otm-workflow-state.shared"
import { revalidateOtmSurfaces } from "./otm-revalidate.server"
import {
  countPendingOtmExceptionsForRequest,
  syncOtmExceptionsOnSubmit,
} from "./otm-exception.server"
import { notifyOtmLifecycle } from "./otm-notification.server"
import type { HrmOtmDayCategory, HrmOtmTimingKind } from "../schemas/otm.schema"

export type SubmitOtmRequestInput = {
  organizationId: string
  userId: string
  sessionId: string | null
  employeeId: string
  overtimeTypeId: string | null
  workDate: string
  startTime: string
  endTime: string
  timingKind: HrmOtmTimingKind
  dayCategory?: HrmOtmDayCategory
  reason: string
  initiatedBy: "employee" | "manager" | "hr"
  eligibilityExceptionReason?: string | null
}

export async function submitOtmRequest(
  input: SubmitOtmRequestInput
): Promise<OtmRequestMutationFormState> {
  const { organizationId, userId, sessionId } = input

  const employee = await getOtmEmployeeForOrg(organizationId, input.employeeId)
  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }
  if (employee.archivedAt) {
    return hrmActionFailure({
      employeeId: "Cannot submit for an archived employee.",
    })
  }

  const durationMinutes = computeOvertimeDurationMinutes(
    input.startTime,
    input.endTime
  )
  if (durationMinutes === null) {
    return hrmActionFailure({
      endTime: "End time must be after start time.",
    })
  }

  const activeTypeCount = await countActiveOtmTypes(organizationId)
  let overtimeTypeId: string | null = input.overtimeTypeId
  let dayCategory: HrmOtmDayCategory
  let eligibilityExceptionReason: string | null = null

  if (activeTypeCount > 0) {
    if (!overtimeTypeId) {
      return hrmActionFailure({
        form: "Select an overtime type configured for your organization.",
      })
    }

    const overtimeType = await getOtmTypeForOrg(
      organizationId,
      overtimeTypeId
    )
    if (!overtimeType) {
      return hrmActionFailure({ form: "Overtime type not found." })
    }

    const parsedCategory = hrmOtmDayCategorySchema.safeParse(
      overtimeType.dayCategory
    )
    dayCategory = parsedCategory.success
      ? parsedCategory.data
      : "normal_day"

    const eligibility = await validateOtmEmployeeEligibility({
      organizationId,
      overtimeTypeId,
      employee,
    })

    if (!eligibility.eligible) {
      if (!eligibility.allowException || input.initiatedBy === "employee") {
        return hrmActionFailure({ employeeId: eligibility.reason })
      }
      const exceptionReason = input.eligibilityExceptionReason?.trim()
      if (!exceptionReason) {
        return hrmActionFailure({
          form: "Eligibility exception reason is required for this employee.",
        })
      }
      eligibilityExceptionReason = exceptionReason
    }
  } else {
    overtimeTypeId = null
    const parsedCategory = hrmOtmDayCategorySchema.safeParse(
      input.dayCategory ?? "normal_day"
    )
    if (!parsedCategory.success) {
      return hrmActionFailure({ form: "Invalid day category." })
    }
    dayCategory = parsedCategory.data
  }

  const approvalSnapshot = buildOtmApprovalSnapshot({
    employeeId: input.employeeId,
    employeeNumber: employee.employeeNumber,
    employeeFullName: employee.legalName,
    workDate: input.workDate,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes,
    timingKind: input.timingKind,
    dayCategory,
    reason: input.reason,
    requestedAt: new Date().toISOString(),
  })

  const currentApproverUserId = await resolveOtmApproverUserId({
    organizationId,
    managerEmployeeId: employee.managerEmployeeId,
  })

  const requestId = crypto.randomUUID()
  const approvalId = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: OTM_REQUEST_APPROVAL_SUBJECT_KIND,
      subjectId: requestId,
      state: "pending",
      requestedByUserId: userId,
      currentApproverUserId,
      snapshot: approvalSnapshot,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await tx.insert(hrmOvertimeRequest).values({
      id: requestId,
      organizationId,
      employeeId: input.employeeId,
      workDate: input.workDate,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes,
      timingKind: input.timingKind,
      overtimeTypeId,
      dayCategory,
      reason: input.reason,
      initiatedBy: input.initiatedBy,
      state: "submitted",
      currentApprovalId: approvalId,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  })

  if (eligibilityExceptionReason) {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_OTM_AUDIT.requestException,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_overtime_request",
      resourceId: requestId,
      metadata: {
        employeeId: input.employeeId,
        overtimeTypeId,
        reason: eligibilityExceptionReason,
      },
    })
  }

  await syncOtmExceptionsOnSubmit({
    organizationId,
    requestId,
    employeeId: input.employeeId,
    workDate: input.workDate,
    durationMinutes,
    timingKind: input.timingKind,
  })

  await notifyOtmLifecycle({
    organizationId,
    requestId,
    event: "submitted",
    targetUserId: currentApproverUserId,
    workDate: input.workDate,
  })

  const pendingExceptions = await countPendingOtmExceptionsForRequest(
    organizationId,
    requestId
  )
  if (pendingExceptions > 0) {
    await notifyOtmLifecycle({
      organizationId,
      requestId,
      event: "exception_pending",
      targetUserId: currentApproverUserId,
      workDate: input.workDate,
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.requestCreate,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_request",
    resourceId: requestId,
    metadata: {
      employeeId: input.employeeId,
      workDate: input.workDate,
      durationMinutes,
      dayCategory,
      overtimeTypeId,
      timingKind: input.timingKind,
      initiatedBy: input.initiatedBy,
      currentApproverUserId,
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
      subjectKind: OTM_REQUEST_APPROVAL_SUBJECT_KIND,
      subjectId: requestId,
      currentApproverUserId,
    },
  })

  revalidateOtmSurfaces()
  return { ok: true, requestId }
}
