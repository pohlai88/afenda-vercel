"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmClaim,
  hrmClaimEvidence,
} from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  applyClaimAmountLimit,
  buildClaimNumber,
  buildClaimApprovalSnapshot,
  buildClaimPolicySnapshot,
  doesClaimRequireEvidence,
  isClaimCancellable,
  isClaimDateInRange,
} from "../data/claim-helpers.shared"
import {
  findClaimEmployeeForUser,
  findOrgDocumentForClaim,
  findOrgEmployeeForClaim,
  getClaimTypeForOrg,
  resolveClaimApproverUserId,
  sumClaimsForEmployeeClaimTypeWindow,
} from "../data/claim.queries.server"
import { requireHrmPermission } from "../data/hrm-admin-guard.server"
import {
  attachClaimEvidenceFormSchema,
  cancelClaimFormSchema,
  requestOwnClaimFormSchema,
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

type SubmitClaimInput = {
  organizationId: string
  userId: string
  sessionId: string | null
  employeeId: string
  claimTypeId: string
  claimDate: string
  amount: number
  currency?: string
  description: string | null
  policyVersion: string | null
  submissionMode: "self_service" | "on_behalf"
}

function claimMonthWindow(claimDate: string): {
  claimDateFrom: string
  claimDateTo: string
} {
  const year = Number(claimDate.slice(0, 4))
  const month = Number(claimDate.slice(5, 7))
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthText = String(month).padStart(2, "0")
  return {
    claimDateFrom: `${year}-${monthText}-01`,
    claimDateTo: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
  }
}

function claimYearWindow(claimDate: string): {
  claimDateFrom: string
  claimDateTo: string
} {
  const year = claimDate.slice(0, 4)
  return {
    claimDateFrom: `${year}-01-01`,
    claimDateTo: `${year}-12-31`,
  }
}

type SubmitClaimFieldErrors = NonNullable<
  Extract<SubmitClaimFormState, { ok: false }>["errors"]
>

async function submitClaimForEmployee(
  input: SubmitClaimInput
): Promise<SubmitClaimFormState> {
  const { organizationId, userId, sessionId } = input

  const [employee, claimType] = await Promise.all([
    findOrgEmployeeForClaim(organizationId, input.employeeId),
    getClaimTypeForOrg(organizationId, input.claimTypeId),
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
    return hrmActionFailure({ claimTypeId: "Claim type is not active." })
  }

  const currency = (input.currency ?? claimType.currency).toUpperCase()
  if (currency !== claimType.currency.toUpperCase()) {
    return hrmActionFailure({
      currency: `Currency must match the claim type (${claimType.currency}).`,
    })
  }

  if (!isClaimDateInRange(input.claimDate, todayIso())) {
    return hrmActionFailure({
      claimDate: "Claim date must be on or before today.",
    })
  }

  const perClaimLimit =
    claimType.perClaimLimit != null ? Number(claimType.perClaimLimit) : null
  const periodLimit =
    claimType.periodLimit != null ? Number(claimType.periodLimit) : null
  const annualLimit =
    claimType.annualLimit != null ? Number(claimType.annualLimit) : null
  const evidenceRequiredAboveAmount =
    claimType.evidenceRequiredAboveAmount != null
      ? Number(claimType.evidenceRequiredAboveAmount)
      : null

  const limitChecks: Array<{
    label: string
    totalBefore: number
    limit: number | null
  }> = [
    { label: "per-claim", totalBefore: 0, limit: perClaimLimit },
  ]

  if (periodLimit != null && periodLimit > 0) {
    const window = claimMonthWindow(input.claimDate)
    const totalBefore = await sumClaimsForEmployeeClaimTypeWindow({
      organizationId,
      employeeId: employee.id,
      claimTypeId: claimType.id,
      ...window,
    })
    limitChecks.push({ label: "monthly", totalBefore, limit: periodLimit })
  }

  if (annualLimit != null && annualLimit > 0) {
    const window = claimYearWindow(input.claimDate)
    const totalBefore = await sumClaimsForEmployeeClaimTypeWindow({
      organizationId,
      employeeId: employee.id,
      claimTypeId: claimType.id,
      ...window,
    })
    limitChecks.push({ label: "annual", totalBefore, limit: annualLimit })
  }

  for (const check of limitChecks) {
    const outcome = applyClaimAmountLimit(
      input.amount + check.totalBefore,
      check.limit
    )
    if (!outcome.ok) {
      return hrmActionFailure({
        amount:
          outcome.limit > 0
            ? `Amount exceeds the ${check.label} limit of ${outcome.limit.toFixed(2)} ${currency}.`
            : "Amount must be greater than 0.",
      })
    }
  }

  const claimId = crypto.randomUUID()
  const claimNumber = buildClaimNumber({ claimDate: input.claimDate, claimId })
  const approvalId = crypto.randomUUID()
  const now = new Date()
  const evidenceRequired = doesClaimRequireEvidence({
    amount: input.amount,
    requiresEvidence: claimType.requiresEvidence,
    evidenceRequiredAboveAmount,
  })
  const payoutMethod = claimType.defaultPayoutMethod || "payroll"
  const taxTreatment =
    claimType.defaultTaxTreatment || "non_taxable_reimbursement"
  const currentApproverUserId = await resolveClaimApproverUserId({
    organizationId,
    managerEmployeeId: employee.managerEmployeeId,
  })
  const policySnapshot = buildClaimPolicySnapshot({
    perClaimLimit,
    periodLimit,
    annualLimit,
    requiresEvidence: claimType.requiresEvidence,
    evidenceRequiredAboveAmount,
    amount: input.amount,
    payoutMethod,
    financeAccountCode: claimType.defaultFinanceAccountCode,
    costCenterCode: claimType.defaultCostCenterCode,
    taxTreatment,
    evaluatedAt: now,
  })

  const approvalSnapshot = {
    ...buildClaimApprovalSnapshot({
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      employeeFullName: employee.legalName,
      claimTypeId: claimType.id,
      claimTypeCode: claimType.code,
      claimTypeName: claimType.name,
      defaultPayrollLineCode: claimType.defaultPayrollLineCode,
      perClaimLimit,
      claimDate: input.claimDate,
      amount: input.amount,
      currency,
      description: input.description,
      evidenceCount: 0,
      evidenceRequired,
      payoutMethod,
      financeAccountCode: claimType.defaultFinanceAccountCode,
      costCenterCode: claimType.defaultCostCenterCode,
      taxTreatment,
      policyVersion: input.policyVersion,
      requestedAt: now,
    }),
    claimNumber,
    policy: policySnapshot,
  }

  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: "claim",
      subjectId: claimId,
      state: "pending",
      requestedByUserId: userId,
      currentApproverUserId,
      snapshot: approvalSnapshot,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await tx.insert(hrmClaim).values({
      id: claimId,
      organizationId,
      claimNumber,
      employeeId: employee.id,
      claimTypeId: claimType.id,
      claimDate: input.claimDate,
      amount: String(input.amount),
      currency,
      description: input.description,
      state: "submitted",
      submittedAt: now,
      submittedByUserId: userId,
      currentApprovalId: approvalId,
      policyVersion: input.policyVersion,
      policySnapshot,
      payoutMethod,
      financeAccountCode: claimType.defaultFinanceAccountCode,
      costCenterCode: claimType.defaultCostCenterCode,
      taxTreatment,
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
      claimNumber,
      employeeId: employee.id,
      claimTypeCode: claimType.code,
      claimDate: input.claimDate,
      amount: input.amount,
      currency,
      submissionMode: input.submissionMode,
      currentApproverUserId,
      evidenceRequired,
      payoutMethod,
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
      subjectKind: "claim",
      subjectId: claimId,
      claimNumber,
      currentApproverUserId,
    },
  })

  revalidateClaims()
  return { ok: true, claimId }
}

function submitClaimFieldErrors(
  errors: SubmitClaimFieldErrors
): SubmitClaimFormState {
  return hrmActionFailure(errors)
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
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return submitClaimFieldErrors({
      claimTypeId: fieldErrors.claimTypeId?.[0],
      claimDate: fieldErrors.claimDate?.[0],
      amount: fieldErrors.amount?.[0],
      currency: fieldErrors.currency?.[0],
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
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return submitClaimFieldErrors({
      employeeId: fieldErrors.employeeId?.[0],
      claimTypeId: fieldErrors.claimTypeId?.[0],
      claimDate: fieldErrors.claimDate?.[0],
      amount: fieldErrors.amount?.[0],
      currency: fieldErrors.currency?.[0],
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
  if (!canManage && document.employeeId !== claim.employeeId) {
    return hrmActionFailure({
      documentId:
        "Self-service evidence must be uploaded against your employee record.",
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
