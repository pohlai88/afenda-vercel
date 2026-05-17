import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { hrmEssDocumentRequest } from "#lib/db/schema"

import { notifyEssRequestLifecycle } from "./employee-portal-notification.server"
import { HRM_ESS_AUDIT } from "../ess.contract"

export type EssDocumentRequestDecisionInput = {
  readonly organizationId: string
  readonly requestId: string
  readonly reviewedByUserId: string
  readonly reviewNote?: string | null
  readonly fulfilledDocumentId?: string | null
}

async function decideDocumentRequest(
  input: EssDocumentRequestDecisionInput & {
    readonly status: "approved" | "rejected"
  }
): Promise<boolean> {
  const [request] = await db
    .select({
      id: hrmEssDocumentRequest.id,
      employeeId: hrmEssDocumentRequest.employeeId,
      submittedByUserId: hrmEssDocumentRequest.submittedByUserId,
      title: hrmEssDocumentRequest.title,
    })
    .from(hrmEssDocumentRequest)
    .where(
      and(
        eq(hrmEssDocumentRequest.organizationId, input.organizationId),
        eq(hrmEssDocumentRequest.id, input.requestId),
        eq(hrmEssDocumentRequest.status, "pending")
      )
    )
    .limit(1)

  if (!request) return false

  const now = new Date()
  await db
    .update(hrmEssDocumentRequest)
    .set({
      status: input.status,
      reviewedByUserId: input.reviewedByUserId,
      reviewNote: input.reviewNote ?? null,
      fulfilledDocumentId: input.fulfilledDocumentId ?? null,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(hrmEssDocumentRequest.id, request.id))

  await writeIamAuditEvent({
    action:
      input.status === "approved"
        ? HRM_ESS_AUDIT.document.approve
        : HRM_ESS_AUDIT.document.reject,
    actorUserId: input.reviewedByUserId,
    actorSessionId: null,
    organizationId: input.organizationId,
    resourceType: "hrm_ess_document_request",
    resourceId: request.id,
    metadata: {
      employeeId: request.employeeId,
      title: request.title,
      fulfilledDocumentId: input.fulfilledDocumentId ?? null,
    },
  })

  await notifyEssRequestLifecycle({
    organizationId: input.organizationId,
    targetUserId: request.submittedByUserId,
    kind: "document_request",
    status: input.status,
    requestId: request.id,
    employeeId: request.employeeId,
  })

  return true
}

export async function approveEssDocumentRequest(
  input: EssDocumentRequestDecisionInput
): Promise<boolean> {
  return decideDocumentRequest({ ...input, status: "approved" })
}

export async function rejectEssDocumentRequest(
  input: EssDocumentRequestDecisionInput
): Promise<boolean> {
  return decideDocumentRequest({ ...input, status: "rejected" })
}
