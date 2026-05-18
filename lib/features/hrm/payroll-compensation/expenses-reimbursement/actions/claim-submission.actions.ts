"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmClaim, hrmClaimEvidence } from "#lib/db/schema"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { isClaimCancellable } from "../data/claim-helpers.shared"
import { HRM_EXPENSE_REIMBURSEMENT_AUDIT } from "../expense-reimbursement.contract"
import {
  validateClaimEvidenceAttachment,
} from "../data/claim-evidence-validation.server"
import { firstBlockingClaimEvidenceIssue } from "../data/claim-evidence-validation.shared"
import {
  findClaimEmployeeForUser,
  findOrgDocumentForClaimEvidence,
  findOrgEmployeeForClaim,
} from "../data/claim.queries.server"
import {
  submitClaimForEmployee,
  revalidateClaims,
} from "../data/claim-submission-mutation.server"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import {
  attachClaimEvidenceFormSchema,
  cancelClaimFormSchema,
  requestOwnClaimFormSchema,
  submitClaimFormSchema,
} from "../schema/claim.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  AttachClaimEvidenceFormState,
  CancelClaimFormState,
  SubmitClaimFormState,
} from "../../../types"

// ---------------------------------------------------------------------------
// Tier B — claim mutations (revalidate via claim-submission-mutation)
// ---------------------------------------------------------------------------

type SubmitClaimFieldErrors = NonNullable<
  Extract<SubmitClaimFormState, { ok: false }>["errors"]
>

function submitClaimFieldErrors(
  errors: SubmitClaimFieldErrors
): SubmitClaimFormState {
  return hrmActionFailure(errors)
}

function parseEvidenceDocumentIds(formData: FormData): string[] {
  return formData
    .getAll("evidenceDocumentIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0)
}

export async function submitOwnClaimAction(
  _prev: SubmitClaimFormState | undefined,
  formData: FormData
): Promise<SubmitClaimFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session
  const employee = await findClaimEmployeeForUser(organizationId, userId)
  if (!employee) {
    return hrmActionFailure({
      form: "Your user is not linked to an active employee record in this organization.",
    })
  }

  const parsed = requestOwnClaimFormSchema.safeParse({
    claimTypeId: formData.get("claimTypeId"),
    claimDate: formData.get("claimDate"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || undefined,
    description: formData.get("description") || null,
    policyVersion: formData.get("policyVersion") || null,
    expenseFundId: formData.get("expenseFundId") || null,
    duplicateOverrideReason: formData.get("duplicateOverrideReason") || null,
    evidenceDocumentIds: parseEvidenceDocumentIds(formData),
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return submitClaimFieldErrors({
      claimTypeId: fieldErrors.claimTypeId?.[0],
      claimDate: fieldErrors.claimDate?.[0],
      amount: fieldErrors.amount?.[0],
      currency: fieldErrors.currency?.[0],
      expenseFundId: fieldErrors.expenseFundId?.[0],
      duplicateOverrideReason: fieldErrors.duplicateOverrideReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return submitClaimForEmployee({
    organizationId,
    userId,
    sessionId,
    employeeId: employee.id,
    ...parsed.data,
    submissionMode: "self_service",
  })
}

export async function submitClaimOnBehalfAction(
  _prev: SubmitClaimFormState | undefined,
  formData: FormData
): Promise<SubmitClaimFormState> {
  const gate = await requireHrmPermission({
    object: "claim",
    function: "create",
    errorMessage: "HRM claim create permission required for this operation.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = submitClaimFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    claimTypeId: formData.get("claimTypeId"),
    claimDate: formData.get("claimDate"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || undefined,
    description: formData.get("description") || null,
    policyVersion: formData.get("policyVersion") || null,
    expenseFundId: formData.get("expenseFundId") || null,
    duplicateOverrideReason: formData.get("duplicateOverrideReason") || null,
    evidenceDocumentIds: parseEvidenceDocumentIds(formData),
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return submitClaimFieldErrors({
      employeeId: fieldErrors.employeeId?.[0],
      claimTypeId: fieldErrors.claimTypeId?.[0],
      claimDate: fieldErrors.claimDate?.[0],
      amount: fieldErrors.amount?.[0],
      currency: fieldErrors.currency?.[0],
      expenseFundId: fieldErrors.expenseFundId?.[0],
      duplicateOverrideReason: fieldErrors.duplicateOverrideReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return submitClaimForEmployee({
    organizationId,
    userId,
    sessionId,
    ...parsed.data,
    submissionMode: "on_behalf",
  })
}

// ---------------------------------------------------------------------------
// Tier B — cancel claim
// ---------------------------------------------------------------------------

/**
 * Cancels a submitted or approved claim. Paid claims are terminal — cancel
 * after payment is rejected at the action level so the audit ledger stays
 * truthful.
 */
export async function cancelClaimAction(
  _prev: CancelClaimFormState | undefined,
  formData: FormData
): Promise<CancelClaimFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

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

  if (!isClaimCancellable(claim.state)) {
    return hrmActionFailure({
      claimId: `Cannot cancel a claim with state "${claim.state}".`,
    })
  }

  const [canManage, employee] = await Promise.all([
    canUseErpPermission({
      organizationId,
      userId,
      permission: { module: "hrm", object: "claim", function: "update" },
    }),
    findOrgEmployeeForClaim(organizationId, claim.employeeId),
  ])
  const isOwnClaim =
    claim.submittedByUserId === userId || employee?.linkedUserId === userId
  if (!canManage && (!isOwnClaim || claim.state !== "submitted")) {
    return hrmActionFailure({
      form: "You can cancel only your own submitted claims.",
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
    action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.cancel,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_claim",
    resourceId: claimId,
    metadata: {
      previousState: claim.state,
      employeeId: claim.employeeId,
    },
  })

  if (claim.currentApprovalId) {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.approval.cancel,
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

// ---------------------------------------------------------------------------
// Tier B — attach evidence (claim ↔ hrm_document)
// ---------------------------------------------------------------------------

/**
 * Links an existing `hrm_document` row to a claim. The document must already
 * exist on the same organization (uploaded via Phase 1B's
 * `attachEmployeeDocumentAction`). One claim may have multiple evidence
 * rows; the unique index `hrm_claim_evidence_claim_document_uidx` prevents
 * the same document being linked twice.
 *
 * Audit: `erp.hrm.claim.attach_evidence`.
 */
export async function attachClaimEvidenceAction(
  _prev: AttachClaimEvidenceFormState | undefined,
  formData: FormData
): Promise<AttachClaimEvidenceFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

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
  if (
    claim.state === "paid" ||
    claim.state === "rejected" ||
    claim.state === "cancelled"
  ) {
    return hrmActionFailure({
      claimId: `Cannot attach evidence to a ${claim.state} claim.`,
    })
  }

  const [canManage, employee] = await Promise.all([
    canUseErpPermission({
      organizationId,
      userId,
      permission: { module: "hrm", object: "claim", function: "update" },
    }),
    findOrgEmployeeForClaim(organizationId, claim.employeeId),
  ])
  const isOwnClaim =
    claim.submittedByUserId === userId || employee?.linkedUserId === userId
  if (!canManage && !isOwnClaim) {
    return hrmActionFailure({
      form: "You can attach evidence only to your own claims.",
    })
  }

  const document = await findOrgDocumentForClaimEvidence(
    organizationId,
    documentId
  )
  if (!document) {
    return hrmActionFailure({ documentId: "Document not found." })
  }
  if (document.employeeId && document.employeeId !== claim.employeeId) {
    return hrmActionFailure({
      documentId:
        "Document is attached to a different employee — re-upload against the claimant.",
    })
  }
  if (!canManage && document.employeeId !== claim.employeeId) {
    return hrmActionFailure({
      documentId:
        "Self-service evidence must be uploaded against your employee record.",
    })
  }

  const evidenceIssues = await validateClaimEvidenceAttachment({
    organizationId,
    claimId,
    evidenceType,
    document,
  })
  const blockingEvidence = firstBlockingClaimEvidenceIssue(evidenceIssues)
  if (blockingEvidence) {
    return hrmActionFailure({ documentId: blockingEvidence.message })
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
    action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.attachEvidence,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_claim",
    resourceId: claimId,
    metadata: {
      claimEvidenceId: evidenceId,
      documentId,
      evidenceType,
    },
  })

  revalidateClaims()
  return { ok: true, evidenceId }
}
