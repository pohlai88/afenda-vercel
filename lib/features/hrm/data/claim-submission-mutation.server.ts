import "server-only"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmClaim, hrmClaimEvidence } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { and, eq } from "drizzle-orm"

import {
  applyClaimAmountLimit,
  buildClaimNumber,
  buildClaimApprovalSnapshot,
  buildClaimPolicySnapshot,
  doesClaimRequireEvidence,
  isClaimCancellable,
  isClaimDateInRange,
} from "./claim-helpers.shared"
import {
  findOrgDocumentForClaim,
  findOrgEmployeeForClaim,
  getClaimTypeForOrg,
  resolveClaimApproverUserId,
  sumClaimsForEmployeeClaimTypeWindow,
} from "./claim.queries.server"
import type {
  AttachClaimEvidenceFormState,
  CancelClaimFormState,
  SubmitClaimFormState,
} from "../types"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import { withPortalMutationSpan } from "./portal-mutation-tracing.server"

export function revalidateClaims() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/claims"), "layout")
  revalidatePath(toLocalePortalRevalidatePattern("/employee/claims"), "page")
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
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

export type SubmitClaimForEmployeeInput = {
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

export async function submitClaimForEmployee(
  input: SubmitClaimForEmployeeInput
): Promise<SubmitClaimFormState> {
  const run = async (): Promise<SubmitClaimFormState> =>
    submitClaimForEmployeeBody(input)
  if (input.submissionMode === "self_service") {
    return withPortalMutationSpan(
      {
        spanName: "hrm.portal.claims.submit",
        section: "claims",
        organizationId: input.organizationId,
        employeeId: input.employeeId,
      },
      run
    )
  }
  return run()
}

async function submitClaimForEmployeeBody(
  input: SubmitClaimForEmployeeInput
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
  }> = [{ label: "per-claim", totalBefore: 0, limit: perClaimLimit }]

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

export type CancelClaimForPortalEmployeeInput = {
  organizationId: string
  userId: string
  sessionId: string | null
  employeeId: string
  claimId: string
  cancelledReason: string | null
}

export async function cancelClaimForPortalEmployee(
  input: CancelClaimForPortalEmployeeInput
): Promise<CancelClaimFormState> {
  return withPortalMutationSpan(
    {
      spanName: "hrm.portal.claims.cancel",
      section: "claims",
      organizationId: input.organizationId,
      employeeId: input.employeeId,
    },
    () => cancelClaimForPortalEmployeeBody(input)
  )
}

async function cancelClaimForPortalEmployeeBody(
  input: CancelClaimForPortalEmployeeInput
): Promise<CancelClaimFormState> {
  const {
    organizationId,
    userId,
    sessionId,
    employeeId,
    claimId,
    cancelledReason,
  } = input

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
  if (claim.employeeId !== employeeId) {
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

  const approvalId = claim.currentApprovalId
  after(async () => {
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
    if (approvalId) {
      await writeIamAuditEventFromNextHeaders({
        action: "erp.hrm.approval.cancel",
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_approval",
        resourceId: approvalId,
        metadata: { subjectKind: "claim", subjectId: claimId },
      })
    }
  })

  revalidateClaims()
  return { ok: true, claimId }
}

export type AttachClaimEvidenceForPortalEmployeeInput = {
  organizationId: string
  userId: string
  sessionId: string | null
  employeeId: string
  claimId: string
  documentId: string
  evidenceType: string
  notes: string | null
}

export async function attachClaimEvidenceForPortalEmployee(
  input: AttachClaimEvidenceForPortalEmployeeInput
): Promise<AttachClaimEvidenceFormState> {
  return withPortalMutationSpan(
    {
      spanName: "hrm.portal.claims.attach_evidence",
      section: "claims",
      organizationId: input.organizationId,
      employeeId: input.employeeId,
    },
    () => attachClaimEvidenceForPortalEmployeeBody(input)
  )
}

async function attachClaimEvidenceForPortalEmployeeBody(
  input: AttachClaimEvidenceForPortalEmployeeInput
): Promise<AttachClaimEvidenceFormState> {
  const {
    organizationId,
    userId,
    sessionId,
    employeeId,
    claimId,
    documentId,
    evidenceType,
    notes,
  } = input

  const claim = await db.query.hrmClaim.findFirst({
    where: and(
      eq(hrmClaim.id, claimId),
      eq(hrmClaim.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      employeeId: true,
    },
  })

  if (!claim) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }
  if (claim.employeeId !== employeeId) {
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
  if (document.employeeId !== employeeId) {
    return hrmActionFailure({
      documentId:
        "Self-service evidence must be uploaded against your employee record.",
    })
  }

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

  const evidenceId = crypto.randomUUID()

  await db.insert(hrmClaimEvidence).values({
    id: evidenceId,
    organizationId,
    claimId,
    documentId,
    evidenceType,
    notes,
    uploadedByUserId: userId,
  })

  after(() => {
    void writeIamAuditEventFromNextHeaders({
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
  })

  revalidateClaims()
  return { ok: true, evidenceId }
}
