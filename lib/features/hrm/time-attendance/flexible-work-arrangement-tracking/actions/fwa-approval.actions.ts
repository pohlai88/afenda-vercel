"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmFlexibleWorkRequest } from "#lib/db/schema"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { FwaApprovalFormState } from "../../../types"
import { HRM_FWA_AUDIT } from "../fwa.contract"
import {
  fwaApprovalDecisionSchema,
  fwaRejectDecisionSchema,
  fwaReturnDecisionSchema,
} from "../schemas/fwa.schema"
import { revalidateFwaSurfaces } from "../data/fwa-revalidate.server"

async function canDecideFwaRequest(input: {
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
      object: "flexible_work",
      function: "update",
    },
  })
}

export async function approveFwaRequestAction(
  _prev: FwaApprovalFormState | undefined,
  formData: FormData
): Promise<FwaApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = fwaApprovalDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({
      requestId: parsed.error.issues[0]?.message,
    })
  }

  const { requestId, decisionNote } = parsed.data

  const req = await db.query.hrmFlexibleWorkRequest.findFirst({
    where: and(
      eq(hrmFlexibleWorkRequest.id, requestId),
      eq(hrmFlexibleWorkRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
      arrangementTypeId: true,
      startDate: true,
    },
  })

  if (!req) {
    return hrmActionFailure({ requestId: "Flexible work request not found." })
  }

  if (req.state !== "submitted") {
    return hrmActionFailure({
      requestId: `Cannot approve a request with state "${req.state}". Expected "submitted".`,
    })
  }

  const allowed = await canDecideFwaRequest({
    organizationId,
    userId,
    currentApprovalId: req.currentApprovalId,
  })

  if (!allowed) {
    return hrmActionFailure({
      form: "You are not authorized to approve this request.",
    })
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
      .update(hrmFlexibleWorkRequest)
      .set({
        state: "active",
        approvedByUserId: userId,
        approvedAt: now,
        updatedByUserId: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hrmFlexibleWorkRequest.id, requestId),
          eq(hrmFlexibleWorkRequest.organizationId, organizationId)
        )
      )
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_FWA_AUDIT.requestApprove,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_flexible_work_request",
    resourceId: requestId,
    metadata: {
      employeeId: req.employeeId,
      arrangementTypeId: req.arrangementTypeId,
      startDate: req.startDate,
      decisionNote,
    },
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

  revalidateFwaSurfaces()
  return { ok: true, requestId }
}

export async function rejectFwaRequestAction(
  _prev: FwaApprovalFormState | undefined,
  formData: FormData
): Promise<FwaApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = fwaRejectDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
    rejectedReason: formData.get("rejectedReason"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      rejectedReason: parsed.error.issues[0]?.message,
    })
  }

  const { requestId, rejectedReason } = parsed.data

  const req = await db.query.hrmFlexibleWorkRequest.findFirst({
    where: and(
      eq(hrmFlexibleWorkRequest.id, requestId),
      eq(hrmFlexibleWorkRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
    },
  })

  if (!req) {
    return hrmActionFailure({ requestId: "Flexible work request not found." })
  }

  if (req.state !== "submitted") {
    return hrmActionFailure({
      requestId: `Cannot reject a request with state "${req.state}". Expected "submitted".`,
    })
  }

  const allowed = await canDecideFwaRequest({
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
      .update(hrmFlexibleWorkRequest)
      .set({
        state: "rejected",
        rejectedReason,
        updatedByUserId: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hrmFlexibleWorkRequest.id, requestId),
          eq(hrmFlexibleWorkRequest.organizationId, organizationId)
        )
      )
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_FWA_AUDIT.requestReject,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_flexible_work_request",
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

  revalidateFwaSurfaces()
  return { ok: true, requestId }
}

export async function returnFwaRequestAction(
  _prev: FwaApprovalFormState | undefined,
  formData: FormData
): Promise<FwaApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = fwaReturnDecisionSchema.safeParse({
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

  const req = await db.query.hrmFlexibleWorkRequest.findFirst({
    where: and(
      eq(hrmFlexibleWorkRequest.id, requestId),
      eq(hrmFlexibleWorkRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
    },
  })

  if (!req) {
    return hrmActionFailure({ requestId: "Flexible work request not found." })
  }

  if (req.state !== "submitted") {
    return hrmActionFailure({
      requestId: `Cannot return a request with state "${req.state}". Expected "submitted".`,
    })
  }

  const allowed = await canDecideFwaRequest({
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
      .update(hrmFlexibleWorkRequest)
      .set({
        state: "returned",
        rejectedReason: returnedReason,
        currentApprovalId: null,
        updatedByUserId: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hrmFlexibleWorkRequest.id, requestId),
          eq(hrmFlexibleWorkRequest.organizationId, organizationId)
        )
      )
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_FWA_AUDIT.requestReturn,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_flexible_work_request",
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

  revalidateFwaSurfaces()
  return { ok: true, requestId }
}
