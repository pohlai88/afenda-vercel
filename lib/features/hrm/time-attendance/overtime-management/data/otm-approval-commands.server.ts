import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmOvertimeRequest } from "#lib/db/schema"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { HRM_OTM_AUDIT } from "../otm.contract"
import {
  calculateOtmPayableForApproval,
  persistOtmCalculationSnapshot,
} from "./otm-calculation.server"
import { applyOtmCompensatoryLeaveCredit } from "./otm-compensatory-leave.server"
import {
  type OtmApprovalSnapshot,
  parseOtmApprovalSnapshot,
} from "./otm-approval-snapshot.shared"
import { readOtmApprovalStage } from "./otm-approval-routing.shared"
import { resolveOtmHrApproverUserId } from "./otm-approver-routing.server"
import { countPendingOtmExceptionsForRequest } from "./otm-exception.server"
import {
  notifyOtmEmployeeLifecycle,
  notifyOtmLifecycle,
} from "./otm-notification.server"
import { computeOvertimeDurationMinutes } from "./otm-display.shared"
import { syncOtmExceptionsOnSubmit } from "./otm-exception.server"
import { getOtmPolicyForOrg } from "./otm-policy.server"

export async function canDecideOtmRequest(input: {
  organizationId: string
  userId: string
  currentApprovalId: string | null
}): Promise<boolean> {
  if (input.currentApprovalId) {
    const approval = await db.query.hrmApproval.findFirst({
      where: and(
        eq(hrmApproval.organizationId, input.organizationId),
        eq(hrmApproval.id, input.currentApprovalId)
      ),
      columns: { currentApproverUserId: true, state: true },
    })

    if (
      approval?.state === "pending" &&
      approval.currentApproverUserId === input.userId
    ) {
      return true
    }
  }

  return canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: {
      module: "hrm",
      object: "overtime",
      function: "update",
    },
  })
}

export type OtmApproveRequestResult =
  | {
      ok: true
      outcome: "approved"
      requestId: string
      payableMinutes: number
      compensatory:
        | { status: "skipped"; reason: string }
        | {
            status: "credited"
            leaveDays: number
            leaveTypeCode: string
          }
        | { status: "failed"; reason: string }
    }
  | {
      ok: true
      outcome: "advanced_to_hr"
      requestId: string
    }
  | {
      ok: false
      requestId: string
      errors: {
        form?: string
        requestId?: string
      }
    }

export async function executeOtmRequestApproval(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requestId: string
  decisionNote?: string | null
}): Promise<OtmApproveRequestResult> {
  const { organizationId, userId, sessionId, requestId, decisionNote } = input

  const req = await db.query.hrmOvertimeRequest.findFirst({
    where: and(
      eq(hrmOvertimeRequest.id, requestId),
      eq(hrmOvertimeRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
      workDate: true,
      durationMinutes: true,
      overtimeTypeId: true,
    },
  })

  if (!req) {
    return {
      ok: false,
      requestId,
      errors: { requestId: "Overtime request not found." },
    }
  }

  if (req.state !== "submitted") {
    return {
      ok: false,
      requestId,
      errors: {
        requestId: `Cannot approve a request with state "${req.state}". Expected "submitted".`,
      },
    }
  }

  const allowed = await canDecideOtmRequest({
    organizationId,
    userId,
    currentApprovalId: req.currentApprovalId,
  })

  if (!allowed) {
    return {
      ok: false,
      requestId,
      errors: {
        form: "You are not authorized to approve this request.",
      },
    }
  }

  const pendingExceptions = await countPendingOtmExceptionsForRequest(
    organizationId,
    requestId
  )
  if (pendingExceptions > 0) {
    return {
      ok: false,
      requestId,
      errors: {
        form: `Resolve ${pendingExceptions} pending policy exception(s) before approving this request.`,
      },
    }
  }

  const policy = await getOtmPolicyForOrg(organizationId)
  const approvalId = req.currentApprovalId
  let approvalSnapshot: OtmApprovalSnapshot | null = null

  if (approvalId) {
    const approval = await db.query.hrmApproval.findFirst({
      where: and(
        eq(hrmApproval.id, approvalId),
        eq(hrmApproval.organizationId, organizationId)
      ),
      columns: { snapshot: true },
    })
    approvalSnapshot = parseOtmApprovalSnapshot(approval?.snapshot)
  }

  const approvalStage = readOtmApprovalStage(
    approvalSnapshot,
    policy
  )

  if (approvalStage === "manager" && policy.requireHrSecondApproval) {
    const hrApproverUserId = await resolveOtmHrApproverUserId(organizationId)
    if (!hrApproverUserId) {
      return {
        ok: false,
        requestId,
        errors: {
          form: "No HR approver is configured for the second approval stage.",
        },
      }
    }

    const now = new Date()
    const baseSnapshot =
      approvalSnapshot ??
      ({
        employeeId: req.employeeId,
        employeeNumber: null,
        employeeFullName: req.employeeId,
        workDate: req.workDate,
        startTime: "",
        endTime: "",
        durationMinutes: req.durationMinutes,
        timingKind: "actual",
        dayCategory: "normal_day",
        reason: null,
        requestedAt: now.toISOString(),
      } satisfies OtmApprovalSnapshot)

    const updatedSnapshot: OtmApprovalSnapshot = {
      ...baseSnapshot,
      approvalStage: "hr",
      managerApprovedByUserId: userId,
      managerApprovedAt: now.toISOString(),
    }

    await db.transaction(async (tx) => {
      if (approvalId) {
        await tx
          .update(hrmApproval)
          .set({
            currentApproverUserId: hrApproverUserId,
            snapshot: updatedSnapshot,
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
    })

    await writeIamAuditEventFromNextHeaders({
      action: HRM_OTM_AUDIT.requestManagerAdvance,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_overtime_request",
      resourceId: requestId,
      metadata: {
        employeeId: req.employeeId,
        workDate: req.workDate,
        hrApproverUserId,
        decisionNote,
      },
    })

    await notifyOtmLifecycle({
      organizationId,
      requestId,
      event: "advanced_to_hr",
      targetUserId: hrApproverUserId,
      workDate: req.workDate,
    })

    return { ok: true, outcome: "advanced_to_hr", requestId }
  }

  const calculation = await calculateOtmPayableForApproval({
    organizationId,
    employeeId: req.employeeId,
    workDate: req.workDate,
    durationMinutes: req.durationMinutes,
    overtimeTypeId: req.overtimeTypeId,
    requestId,
  })

  if (!calculation.ok) {
    return {
      ok: false,
      requestId,
      errors: { form: calculation.reason },
    }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    if (approvalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "approved",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote,
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
        state: "approved",
        payableMinutes: calculation.payableMinutes,
        approvedByUserId: userId,
        approvedAt: now,
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
    action: HRM_OTM_AUDIT.requestApprove,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_request",
    resourceId: requestId,
    metadata: {
      employeeId: req.employeeId,
      workDate: req.workDate,
      durationMinutes: req.durationMinutes,
      payableMinutes: calculation.payableMinutes,
      multiplierHundredths: calculation.multiplierHundredths,
      decisionNote,
    },
  })

  await persistOtmCalculationSnapshot({
    organizationId,
    requestId,
    userId,
    sessionId,
    calculation,
  })

  if (approvalId) {
    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.approve",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_approval",
      resourceId: approvalId,
      metadata: { subjectId: requestId, decisionNote },
    })
  }

  const compensatory = await applyOtmCompensatoryLeaveCredit({
    organizationId,
    userId,
    sessionId,
    requestId,
    employeeId: req.employeeId,
    workDate: req.workDate,
    payableMinutes: calculation.payableMinutes,
  })

  await notifyOtmEmployeeLifecycle({
    organizationId,
    employeeId: req.employeeId,
    requestId,
    event: "approved",
    workDate: req.workDate,
  })

  return {
    ok: true,
    outcome: "approved",
    requestId,
    payableMinutes: calculation.payableMinutes,
    compensatory:
      compensatory.status === "credited"
        ? {
            status: "credited",
            leaveDays: compensatory.leaveDays,
            leaveTypeCode: compensatory.leaveTypeCode,
          }
        : compensatory.status === "failed"
          ? { status: "failed", reason: compensatory.reason }
          : { status: "skipped", reason: compensatory.reason },
  }
}

export type OtmAdjustRequestResult =
  | { ok: true; requestId: string }
  | {
      ok: false
      requestId: string
      errors: {
        form?: string
        requestId?: string
        workDate?: string
        startTime?: string
        endTime?: string
        adjustmentReason?: string
      }
    }

export async function executeOtmRequestAdjust(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requestId: string
  workDate: string
  startTime: string
  endTime: string
  adjustmentReason: string
  decisionNote?: string | null
}): Promise<OtmAdjustRequestResult> {
  const {
    organizationId,
    userId,
    sessionId,
    requestId,
    workDate,
    startTime,
    endTime,
    adjustmentReason,
    decisionNote,
  } = input

  const durationMinutes = computeOvertimeDurationMinutes(startTime, endTime)
  if (durationMinutes === null) {
    return {
      ok: false,
      requestId,
      errors: { endTime: "End time must be after start time." },
    }
  }

  const req = await db.query.hrmOvertimeRequest.findFirst({
    where: and(
      eq(hrmOvertimeRequest.id, requestId),
      eq(hrmOvertimeRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
      workDate: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      timingKind: true,
      dayCategory: true,
      reason: true,
      overtimeTypeId: true,
    },
  })

  if (!req) {
    return {
      ok: false,
      requestId,
      errors: { requestId: "Overtime request not found." },
    }
  }

  if (req.state !== "submitted") {
    return {
      ok: false,
      requestId,
      errors: {
        requestId: `Cannot adjust a request with state "${req.state}". Expected "submitted".`,
      },
    }
  }

  const allowed = await canDecideOtmRequest({
    organizationId,
    userId,
    currentApprovalId: req.currentApprovalId,
  })

  if (!allowed) {
    return {
      ok: false,
      requestId,
      errors: {
        form: "You are not authorized to adjust this request.",
      },
    }
  }

  const approvalId = req.currentApprovalId
  let approvalSnapshot: OtmApprovalSnapshot | null = null

  if (approvalId) {
    const approval = await db.query.hrmApproval.findFirst({
      where: and(
        eq(hrmApproval.id, approvalId),
        eq(hrmApproval.organizationId, organizationId)
      ),
      columns: { snapshot: true },
    })
    approvalSnapshot = parseOtmApprovalSnapshot(approval?.snapshot)
  }

  const updatedSnapshot: OtmApprovalSnapshot = {
    ...(approvalSnapshot ?? {
      employeeId: req.employeeId,
      employeeNumber: null,
      employeeFullName: req.employeeId,
      workDate: req.workDate,
      startTime: req.startTime,
      endTime: req.endTime,
      durationMinutes: req.durationMinutes,
      timingKind: req.timingKind as OtmApprovalSnapshot["timingKind"],
      dayCategory: req.dayCategory as OtmApprovalSnapshot["dayCategory"],
      reason: req.reason,
      requestedAt: new Date().toISOString(),
    }),
    workDate,
    startTime,
    endTime,
    durationMinutes,
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmOvertimeRequest)
      .set({
        workDate,
        startTime,
        endTime,
        durationMinutes,
        updatedByUserId: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hrmOvertimeRequest.id, requestId),
          eq(hrmOvertimeRequest.organizationId, organizationId)
        )
      )

    if (approvalId) {
      await tx
        .update(hrmApproval)
        .set({
          snapshot: updatedSnapshot,
          decisionNote: decisionNote ?? adjustmentReason,
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
  })

  await syncOtmExceptionsOnSubmit({
    organizationId,
    requestId,
    employeeId: req.employeeId,
    workDate,
    durationMinutes,
    timingKind: req.timingKind as "planned" | "actual",
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.requestAdjust,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_request",
    resourceId: requestId,
    metadata: {
      employeeId: req.employeeId,
      adjustmentReason,
      previous: {
        workDate: req.workDate,
        startTime: req.startTime,
        endTime: req.endTime,
        durationMinutes: req.durationMinutes,
      },
      next: { workDate, startTime, endTime, durationMinutes },
    },
  })

  await notifyOtmEmployeeLifecycle({
    organizationId,
    employeeId: req.employeeId,
    requestId,
    event: "adjusted",
    workDate,
  })

  return { ok: true, requestId }
}
