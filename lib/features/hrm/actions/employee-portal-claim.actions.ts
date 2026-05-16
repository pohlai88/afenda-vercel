"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmClaim, hrmClaimEvidence } from "#lib/db/schema"

import { isClaimCancellable } from "../data/claim-helpers.shared"
import { findOrgDocumentForClaim } from "../data/claim.queries.server"
import {
  revalidateClaims,
  submitClaimForEmployee,
} from "../data/claim-submission-mutation.server"
import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import {
  attachClaimEvidenceFormSchema,
  cancelClaimFormSchema,
  requestOwnClaimFormSchema,
} from "../schemas/claim.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type {
  AttachClaimEvidenceFormState,
  CancelClaimFormState,
  SubmitClaimFormState,
} from "../types"

export async function submitPortalEmployeeClaimAction(
  _prev: SubmitClaimFormState | undefined,
  formData: FormData
): Promise<SubmitClaimFormState> {
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

  const parsed = requestOwnClaimFormSchema.safeParse({
    claimTypeId: formData.get("claimTypeId"),
    claimDate: formData.get("claimDate"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || undefined,
    description: formData.get("description") || null,
    policyVersion: formData.get("policyVersion") || null,
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimTypeId: fieldErrors.claimTypeId?.[0],
      claimDate: fieldErrors.claimDate?.[0],
      amount: fieldErrors.amount?.[0],
      currency: fieldErrors.currency?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return submitClaimForEmployee({
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    employeeId: context.employee.id,
    ...parsed.data,
    submissionMode: "self_service",
  })
}

export async function cancelPortalEmployeeClaimAction(
  _prev: CancelClaimFormState | undefined,
  formData: FormData
): Promise<CancelClaimFormState> {
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

  const parsed = cancelClaimFormSchema.safeParse({
    claimId: formData.get("claimId"),
    cancelledReason: formData.get("cancelledReason") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({
      claimId: parsed.error.issues[0]?.message,
    })
  }

  const { claimId, cancelledReason } = parsed.data
  const organizationId = context.portal.organizationId
  const userId = context.portal.userId
  const sessionId = context.portal.sessionId

  const claim = await db.query.hrmClaim.findFirst({
    where: and(
      eq(hrmClaim.id, claimId),
      eq(hrmClaim.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
      submittedByUserId: true,
    },
  })

  if (!claim) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }
  if (claim.employeeId !== context.employee.id) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }

  if (!isClaimCancellable(claim.state)) {
    return hrmActionFailure({
      claimId: `Cannot cancel a claim with state "${claim.state}".`,
    })
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmClaim)
      .set({
        state: "cancelled",
        cancelledAt: now,
        cancelledReason,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmClaim.id, claimId))

    if (claim.currentApprovalId) {
      const approval = await tx.query.hrmApproval.findFirst({
        where: eq(hrmApproval.id, claim.currentApprovalId),
        columns: { id: true, state: true },
      })
      if (approval?.state === "pending") {
        await tx
          .update(hrmApproval)
          .set({
            state: "cancelled",
            decisionByUserId: userId,
            decisionAt: now,
            decisionNote: "Claim cancelled.",
            updatedAt: now,
            updatedByUserId: userId,
          })
          .where(eq(hrmApproval.id, claim.currentApprovalId))
      }
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.claim.cancel",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_claim",
    resourceId: claimId,
    metadata: {
      previousState: claim.state,
      employeeId: claim.employeeId,
      portal: true,
    },
  })

  if (claim.currentApprovalId) {
    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.cancel",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_approval",
      resourceId: claim.currentApprovalId,
      metadata: { subjectKind: "claim", subjectId: claimId },
    })
  }

  revalidateClaims()
  return { ok: true, claimId }
}

export async function attachPortalEmployeeClaimEvidenceAction(
  _prev: AttachClaimEvidenceFormState | undefined,
  formData: FormData
): Promise<AttachClaimEvidenceFormState> {
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

  const parsed = attachClaimEvidenceFormSchema.safeParse({
    claimId: formData.get("claimId"),
    documentId: formData.get("documentId"),
    evidenceType: formData.get("evidenceType") ?? "receipt",
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimId: fieldErrors.claimId?.[0],
      documentId: fieldErrors.documentId?.[0],
      evidenceType: fieldErrors.evidenceType?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { claimId, documentId, evidenceType, notes } = parsed.data
  const organizationId = context.portal.organizationId
  const userId = context.portal.userId
  const sessionId = context.portal.sessionId

  const claim = await db.query.hrmClaim.findFirst({
    where: and(
      eq(hrmClaim.id, claimId),
      eq(hrmClaim.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      employeeId: true,
      submittedByUserId: true,
    },
  })

  if (!claim) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }
  if (claim.employeeId !== context.employee.id) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }
  if (
    claim.state === "paid" ||
    claim.state === "rejected" ||
    claim.state === "cancelled"
  ) {
    return hrmActionFailure({
      claimId: `Cannot attach evidence to a ${claim.state} claim.`,
    })
  }

  const document = await findOrgDocumentForClaim(organizationId, documentId)
  if (!document) {
    return hrmActionFailure({ documentId: "Document not found." })
  }
  if (document.employeeId && document.employeeId !== claim.employeeId) {
    return hrmActionFailure({
      documentId:
        "Document is attached to a different employee — re-upload against the claimant.",
    })
  }
  if (document.employeeId !== claim.employeeId) {
    return hrmActionFailure({
      documentId:
        "Self-service evidence must be uploaded against your employee record.",
    })
  }

  const evidenceId = crypto.randomUUID()

  const existing = await db.query.hrmClaimEvidence.findFirst({
    where: and(
      eq(hrmClaimEvidence.claimId, claimId),
      eq(hrmClaimEvidence.documentId, documentId)
    ),
    columns: { id: true },
  })
  if (existing) {
    return hrmActionFailure({
      documentId: "This document is already attached to the claim.",
    })
  }

  await db.insert(hrmClaimEvidence).values({
    id: evidenceId,
    organizationId,
    claimId,
    documentId,
    evidenceType,
    notes,
    uploadedByUserId: userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.claim.attach_evidence",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_claim",
    resourceId: claimId,
    metadata: {
      claimEvidenceId: evidenceId,
      documentId,
      evidenceType,
      portal: true,
    },
  })

  revalidateClaims()
  return { ok: true, evidenceId }
}
