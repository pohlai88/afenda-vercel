import "server-only"

import { and, eq } from "drizzle-orm"

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
import type { OtmApprovalSnapshot } from "./otm-approval-snapshot.shared"
import { resolveOtmSubmissionApprovers } from "./otm-submission-routing.server"
import { isOtmWorkDatePastClaimDeadline } from "./otm-date.shared"
import { validateOtmEmployeeEligibility } from "./otm-eligibility.server"
import { getOtmPolicyForOrg } from "./otm-policy.server"
import {
  countActiveOtmTypes,
  getOtmEmployeeForOrg,
  getOtmTypeForOrg,
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
  saveAsDraft?: boolean
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

  const policy = await getOtmPolicyForOrg(organizationId)

  if (
    policy.enforceClaimDeadlineOnSubmit &&
    isOtmWorkDatePastClaimDeadline({
      workDate: input.workDate,
      claimDeadlineDays: policy.claimDeadlineDays,
    })
  ) {
    return hrmActionFailure({
      workDate:
        "Work date is outside the configured overtime claim deadline.",
    })
  }

  const submissionRouting = await resolveOtmSubmissionApprovers({
    organizationId,
    employeeId: input.employeeId,
    managerEmployeeId: employee.managerEmployeeId,
    hrOwnerEmployeeId: employee.hrOwnerEmployeeId,
    policy,
    workDate: input.workDate,
    durationMinutes,
    timingKind: input.timingKind,
    overtimeTypeId,
    hasEligibilityException: eligibilityExceptionReason != null,
  })

  const approvalSnapshot: OtmApprovalSnapshot = {
    ...buildOtmApprovalSnapshot({
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
    }),
    approvalStage: submissionRouting.approvalStage,
    routingRuleId: submissionRouting.routingRuleId,
    routingApproverKind: submissionRouting.approverKind,
  }

  const currentApproverUserId = submissionRouting.currentApproverUserId

  const requestId = crypto.randomUUID()

  if (input.saveAsDraft) {
    await db.insert(hrmOvertimeRequest).values({
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
      state: "draft",
      currentApprovalId: null,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

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
        state: "draft",
      },
    })

    revalidateOtmSurfaces()
    return { ok: true, requestId }
  }

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
      routingRuleId: submissionRouting.routingRuleId,
      routingApproverKind: submissionRouting.approverKind,
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

const CANCELLABLE_OTM_STATES = ["draft", "submitted", "returned"] as const

export async function cancelOtmRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requestId: string
  employeeId: string
  cancelReason?: string | null
}): Promise<OtmRequestMutationFormState> {
  const { organizationId, userId, sessionId, requestId, employeeId, cancelReason } =
    input

  const req = await db.query.hrmOvertimeRequest.findFirst({
    where: and(
      eq(hrmOvertimeRequest.id, requestId),
      eq(hrmOvertimeRequest.organizationId, organizationId),
      eq(hrmOvertimeRequest.employeeId, employeeId)
    ),
    columns: {
      id: true,
      state: true,
      workDate: true,
      currentApprovalId: true,
    },
  })

  if (!req) {
    return hrmActionFailure({ form: "Overtime request not found." })
  }

  if (
    !CANCELLABLE_OTM_STATES.includes(
      req.state as (typeof CANCELLABLE_OTM_STATES)[number]
    )
  ) {
    return hrmActionFailure({
      form: `Cannot cancel a request with state "${req.state}".`,
    })
  }

  const now = new Date()
  const approvalId = req.currentApprovalId
  let approverUserId: string | null = null

  if (approvalId) {
    const approval = await db.query.hrmApproval.findFirst({
      where: and(
        eq(hrmApproval.id, approvalId),
        eq(hrmApproval.organizationId, organizationId)
      ),
      columns: { currentApproverUserId: true, state: true },
    })
    approverUserId = approval?.currentApproverUserId ?? null
  }

  await db.transaction(async (tx) => {
    if (approvalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "cancelled",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote: cancelReason ?? "Cancelled by employee.",
          updatedByUserId: userId,
          updatedAt: now,
        })
        .where(
          and(
            eq(hrmApproval.id, approvalId),
            eq(hrmApproval.organizationId, organizationId)
          )
        )
    }

    await tx
      .update(hrmOvertimeRequest)
      .set({
        state: "cancelled",
        currentApprovalId: null,
        rejectedReason: cancelReason ?? null,
        updatedByUserId: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hrmOvertimeRequest.id, requestId),
          eq(hrmOvertimeRequest.organizationId, organizationId)
        )
      )
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.requestCancel,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_request",
    resourceId: requestId,
    metadata: {
      employeeId,
      previousState: req.state,
      cancelReason: cancelReason ?? null,
    },
  })

  if (approvalId) {
    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.cancel",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_approval",
      resourceId: approvalId,
      metadata: { subjectId: requestId, cancelReason },
    })
  }

  if (approverUserId && req.state === "submitted") {
    await notifyOtmLifecycle({
      organizationId,
      requestId,
      event: "cancelled",
      targetUserId: approverUserId,
      workDate: req.workDate,
    })
  }

  revalidateOtmSurfaces()
  return { ok: true, requestId }
}

export async function submitOtmDraftRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requestId: string
  employeeId: string
}): Promise<OtmRequestMutationFormState> {
  const { organizationId, userId, sessionId, requestId, employeeId } = input

  const req = await db.query.hrmOvertimeRequest.findFirst({
    where: and(
      eq(hrmOvertimeRequest.id, requestId),
      eq(hrmOvertimeRequest.organizationId, organizationId),
      eq(hrmOvertimeRequest.employeeId, employeeId)
    ),
    columns: {
      id: true,
      state: true,
      employeeId: true,
      workDate: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      timingKind: true,
      overtimeTypeId: true,
      dayCategory: true,
      reason: true,
      initiatedBy: true,
    },
  })

  if (!req) {
    return hrmActionFailure({ form: "Overtime request not found." })
  }

  if (req.state !== "draft") {
    return hrmActionFailure({
      form: `Cannot submit a request with state "${req.state}". Expected "draft".`,
    })
  }

  const employee = await getOtmEmployeeForOrg(organizationId, employeeId)
  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }

  const policy = await getOtmPolicyForOrg(organizationId)

  if (
    policy.enforceClaimDeadlineOnSubmit &&
    isOtmWorkDatePastClaimDeadline({
      workDate: req.workDate,
      claimDeadlineDays: policy.claimDeadlineDays,
    })
  ) {
    return hrmActionFailure({
      workDate:
        "Work date is outside the configured overtime claim deadline.",
    })
  }

  const submissionRouting = await resolveOtmSubmissionApprovers({
    organizationId,
    employeeId: req.employeeId,
    managerEmployeeId: employee.managerEmployeeId,
    hrOwnerEmployeeId: employee.hrOwnerEmployeeId,
    policy,
    workDate: req.workDate,
    durationMinutes: req.durationMinutes,
    timingKind: req.timingKind as HrmOtmTimingKind,
    overtimeTypeId: req.overtimeTypeId,
    hasEligibilityException: false,
  })

  const approvalSnapshot: OtmApprovalSnapshot = {
    ...buildOtmApprovalSnapshot({
      employeeId: req.employeeId,
      employeeNumber: employee.employeeNumber,
      employeeFullName: employee.legalName,
      workDate: req.workDate,
      startTime: req.startTime,
      endTime: req.endTime,
      durationMinutes: req.durationMinutes,
      timingKind: req.timingKind as HrmOtmTimingKind,
      dayCategory: req.dayCategory as HrmOtmDayCategory,
      reason: req.reason,
      requestedAt: new Date().toISOString(),
    }),
    approvalStage: submissionRouting.approvalStage,
    routingRuleId: submissionRouting.routingRuleId,
    routingApproverKind: submissionRouting.approverKind,
  }

  const currentApproverUserId = submissionRouting.currentApproverUserId

  const approvalId = crypto.randomUUID()
  const now = new Date()

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

    await tx
      .update(hrmOvertimeRequest)
      .set({
        state: "submitted",
        currentApprovalId: approvalId,
        requestedAt: now,
        updatedByUserId: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hrmOvertimeRequest.id, requestId),
          eq(hrmOvertimeRequest.organizationId, organizationId)
        )
      )
  })

  await syncOtmExceptionsOnSubmit({
    organizationId,
    requestId,
    employeeId: req.employeeId,
    workDate: req.workDate,
    durationMinutes: req.durationMinutes,
    timingKind: req.timingKind as HrmOtmTimingKind,
  })

  await notifyOtmLifecycle({
    organizationId,
    requestId,
    event: "submitted",
    targetUserId: currentApproverUserId,
    workDate: req.workDate,
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
      workDate: req.workDate,
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
      employeeId: req.employeeId,
      workDate: req.workDate,
      durationMinutes: req.durationMinutes,
      promotedFrom: "draft",
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
