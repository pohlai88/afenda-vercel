"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmOvertimeRequest } from "#lib/db/schema"
import { requireOrgSession } from "#lib/auth"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  OtmApprovalFormState,
  OtmBulkApprovalFormState,
} from "../../../types"
import { HRM_OTM_AUDIT } from "../otm.contract"
import {
  canDecideOtmRequest,
  executeOtmRequestApproval,
} from "../data/otm-approval-commands.server"
import { revalidateOtmSurfaces } from "../data/otm-revalidate.server"
import { notifyOtmEmployeeLifecycle } from "../data/otm-notification.server"
import {
  bulkApproveOtmRequestsFormSchema,
  otmApprovalDecisionSchema,
  otmRejectDecisionSchema,
  otmReturnDecisionSchema,
} from "../schemas/otm.schema"

export async function approveOtmRequestAction(
  _prev: OtmApprovalFormState | undefined,
  formData: FormData
): Promise<OtmApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = otmApprovalDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({
      requestId: parsed.error.issues[0]?.message,
    })
  }

  const result = await executeOtmRequestApproval({
    organizationId,
    userId,
    sessionId,
    requestId: parsed.data.requestId,
    decisionNote: parsed.data.decisionNote,
  })

  if (!result.ok) {
    return hrmActionFailure(result.errors)
  }

  revalidateOtmSurfaces()
  return { ok: true, requestId: result.requestId }
}

export async function bulkApproveOtmRequestsAction(
  _prev: OtmBulkApprovalFormState | undefined,
  formData: FormData
): Promise<OtmBulkApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const rawIds = formData
    .getAll("requestIds")
    .filter((value): value is string => typeof value === "string")

  const parsed = bulkApproveOtmRequestsFormSchema.safeParse({
    requestIds: [...new Set(rawIds)],
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: errs.requestIds?.[0] ?? parsed.error.issues[0]?.message,
    })
  }

  const { requestIds, decisionNote } = parsed.data
  const approved: string[] = []
  const failed: { requestId: string; message: string }[] = []

  for (const requestId of requestIds) {
    const result = await executeOtmRequestApproval({
      organizationId,
      userId,
      sessionId,
      requestId,
      decisionNote,
    })

    if (result.ok) {
      approved.push(requestId)
    } else {
      failed.push({
        requestId,
        message:
          result.errors.form ??
          result.errors.requestId ??
          "Could not approve this request.",
      })
    }
  }

  if (approved.length === 0) {
    return hrmActionFailure({
      form: failed[0]?.message ?? "No requests were approved.",
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.requestBulkApprove,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_request",
    resourceId: approved[0]!,
    metadata: {
      approvedCount: approved.length,
      failedCount: failed.length,
      approvedRequestIds: approved,
      failed,
      decisionNote,
    },
  })

  revalidateOtmSurfaces()
  return { ok: true, approved, failed }
}

export async function rejectOtmRequestAction(
  _prev: OtmApprovalFormState | undefined,
  formData: FormData
): Promise<OtmApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = otmRejectDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    rejectedReason: formData.get("rejectedReason"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      rejectedReason: parsed.error.issues[0]?.message,
    })
  }

  const { requestId, rejectedReason } = parsed.data

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
    },
  })

  if (!req) {
    return hrmActionFailure({ requestId: "Overtime request not found." })
  }

  if (req.state !== "submitted") {
    return hrmActionFailure({
      requestId: `Cannot reject a request with state "${req.state}". Expected "submitted".`,
    })
  }

  const allowed = await canDecideOtmRequest({
    organizationId,
    userId,
    currentApprovalId: req.currentApprovalId,
  })

  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to reject this request.",
    })
  }

  const now = new Date()
  const approvalId = req.currentApprovalId

  await db.transaction(async (tx) => {
    if (approvalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "rejected",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote: rejectedReason,
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
        state: "rejected",
        rejectedReason,
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
    action: HRM_OTM_AUDIT.requestReject,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_request",
    resourceId: requestId,
    metadata: { employeeId: req.employeeId, rejectedReason },
  })

  if (approvalId) {
    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.reject",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_approval",
      resourceId: approvalId,
      metadata: { subjectId: requestId, rejectedReason },
    })
  }

  await notifyOtmEmployeeLifecycle({
    organizationId,
    employeeId: req.employeeId,
    requestId,
    event: "rejected",
    workDate: req.workDate,
  })

  revalidateOtmSurfaces()
  return { ok: true, requestId }
}

export async function returnOtmRequestAction(
  _prev: OtmApprovalFormState | undefined,
  formData: FormData
): Promise<OtmApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = otmReturnDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    returnedReason: formData.get("returnedReason"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      returnedReason: errs.returnedReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { requestId, returnedReason, decisionNote } = parsed.data

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
    },
  })

  if (!req) {
    return hrmActionFailure({ requestId: "Overtime request not found." })
  }

  if (req.state !== "submitted") {
    return hrmActionFailure({
      requestId: `Cannot return a request with state "${req.state}". Expected "submitted".`,
    })
  }

  const allowed = await canDecideOtmRequest({
    organizationId,
    userId,
    currentApprovalId: req.currentApprovalId,
  })

  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to return this request.",
    })
  }

  const now = new Date()
  const approvalId = req.currentApprovalId

  await db.transaction(async (tx) => {
    if (approvalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "cancelled",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote: decisionNote ?? returnedReason,
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
        state: "returned",
        rejectedReason: returnedReason,
        currentApprovalId: null,
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
    action: HRM_OTM_AUDIT.requestReturn,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_overtime_request",
    resourceId: requestId,
    metadata: {
      employeeId: req.employeeId,
      returnedReason,
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
      metadata: { subjectId: requestId, returnedReason },
    })
  }

  await notifyOtmEmployeeLifecycle({
    organizationId,
    employeeId: req.employeeId,
    requestId,
    event: "returned",
    workDate: req.workDate,
  })

  revalidateOtmSurfaces()
  return { ok: true, requestId }
}
