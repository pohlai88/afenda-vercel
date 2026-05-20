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
import { countPendingOtmExceptionsForRequest } from "./otm-exception.server"
import { notifyOtmEmployeeLifecycle } from "./otm-notification.server"

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
  const approvalId = req.currentApprovalId

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
