"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmClaim,
  hrmClaimEvidence,
  hrmClaimType,
} from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  applyPerClaimLimit,
  buildClaimApprovalSnapshot,
  isClaimCancellable,
  isClaimDateInRange,
} from "../data/claim-helpers.shared"
import {
  findOrgDocumentForClaim,
  findOrgEmployeeForClaim,
} from "../data/claim.queries.server"
import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import {
  attachClaimEvidenceFormSchema,
  cancelClaimFormSchema,
  submitClaimFormSchema,
} from "../schemas/claim.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type {
  AttachClaimEvidenceFormState,
  CancelClaimFormState,
  SubmitClaimFormState,
} from "../types"

/**
 * Revalidates at **layout** scope so the HRM rail's `claims` pressure
 * badge (Phase 4 — HR Nexus aggregator) refreshes after every claim
 * mutation. The kanban + per-claim drill-down come along for free.
 */
function revalidateClaims() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/claims"), "layout")
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Tier B — submit claim (admin-gated at MVP; member self-service later)
// ---------------------------------------------------------------------------

/**
 * Submits a reimbursable claim. Creates `hrm_claim` (state=submitted) +
 * `hrm_approval(subjectKind=claim, state=pending)` in one transaction.
 * Audit: `erp.hrm.claim.submit` + `erp.hrm.approval.request`.
 */
export async function submitClaimAction(
  _prev: SubmitClaimFormState | undefined,
  formData: FormData
): Promise<SubmitClaimFormState> {
  const gate = await requireHrmAdmin()
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
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fieldErrors.employeeId?.[0],
      claimTypeId: fieldErrors.claimTypeId?.[0],
      claimDate: fieldErrors.claimDate?.[0],
      amount: fieldErrors.amount?.[0],
      currency: fieldErrors.currency?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed

  const [employee, claimType] = await Promise.all([
    findOrgEmployeeForClaim(organizationId, data.employeeId),
    db.query.hrmClaimType.findFirst({
      where: and(
        eq(hrmClaimType.id, data.claimTypeId),
        eq(hrmClaimType.organizationId, organizationId)
      ),
      columns: {
        id: true,
        code: true,
        name: true,
        currency: true,
        perClaimLimit: true,
        defaultPayrollLineCode: true,
        isActive: true,
      },
    }),
  ])

  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }
  if (employee.archivedAt) {
    return hrmActionFailure({
      employeeId: "Cannot submit a claim for an archived employee.",
    })
  }
  if (!claimType) {
    return hrmActionFailure({ claimTypeId: "Claim type not found." })
  }
  if (!claimType.isActive) {
    return hrmActionFailure({
      claimTypeId: "Claim type is not active.",
    })
  }

  const currency = (data.currency ?? claimType.currency).toUpperCase()
  if (currency !== claimType.currency.toUpperCase()) {
    return hrmActionFailure({
      currency: `Currency must match the claim type (${claimType.currency}).`,
    })
  }

  if (!isClaimDateInRange(data.claimDate, todayIso())) {
    return hrmActionFailure({
      claimDate: "Claim date must be on or before today.",
    })
  }

  const limit =
    claimType.perClaimLimit != null ? Number(claimType.perClaimLimit) : null
  const limitOutcome = applyPerClaimLimit(data.amount, limit)
  if (!limitOutcome.ok) {
    return hrmActionFailure({
      amount:
        limitOutcome.limit > 0
          ? `Amount exceeds the per-claim limit of ${limitOutcome.limit.toFixed(2)} ${currency}.`
          : "Amount must be greater than 0.",
    })
  }

  const claimId = crypto.randomUUID()
  const approvalId = crypto.randomUUID()
  const now = new Date()

  const snapshot = buildClaimApprovalSnapshot({
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    employeeFullName: employee.legalName,
    claimTypeId: claimType.id,
    claimTypeCode: claimType.code,
    claimTypeName: claimType.name,
    defaultPayrollLineCode: claimType.defaultPayrollLineCode,
    perClaimLimit: limit,
    claimDate: data.claimDate,
    amount: data.amount,
    currency,
    description: data.description,
    evidenceCount: 0,
    policyVersion: data.policyVersion,
    requestedAt: now,
  })

  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: "claim",
      subjectId: claimId,
      state: "pending",
      requestedByUserId: userId,
      snapshot,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await tx.insert(hrmClaim).values({
      id: claimId,
      organizationId,
      employeeId: employee.id,
      claimTypeId: claimType.id,
      claimDate: data.claimDate,
      amount: String(data.amount),
      currency,
      description: data.description,
      state: "submitted",
      submittedAt: now,
      currentApprovalId: approvalId,
      policyVersion: data.policyVersion,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.claim.submit",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_claim",
    resourceId: claimId,
    metadata: {
      employeeId: employee.id,
      claimTypeCode: claimType.code,
      claimDate: data.claimDate,
      amount: data.amount,
      currency,
    },
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.request",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: { subjectKind: "claim", subjectId: claimId },
  })

  revalidateClaims()
  return { ok: true, claimId }
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
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
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
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
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
    columns: { id: true, state: true, employeeId: true },
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

  const evidenceId = crypto.randomUUID()

  // Surface the unique-index conflict cleanly.
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
    },
  })

  revalidateClaims()
  return { ok: true, evidenceId }
}
