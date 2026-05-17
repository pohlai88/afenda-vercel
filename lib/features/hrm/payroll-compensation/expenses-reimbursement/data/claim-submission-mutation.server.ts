import "server-only"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmClaim,
  hrmClaimDuplicateSignal,
  hrmClaimEvidence,
} from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { and, eq } from "drizzle-orm"

import {
  buildClaimNumber,
  buildClaimApprovalSnapshot,
  buildClaimPolicySnapshot,
  doesClaimRequireEvidence,
  isClaimCancellable,
  isClaimDateInRange,
} from "./claim-helpers.shared"
import {
  HRM_CLAIM_EVENT_TYPES,
  HRM_EXPENSE_REIMBURSEMENT_AUDIT,
} from "../expense-reimbursement.contract"
import {
  resolveClaimAttachEvidenceAuditAction,
  resolveClaimCancelAuditAction,
  resolveClaimSubmitAuditAction,
} from "./claim-audit-actions.server"
import { evaluateClaimSubmission } from "./claim-evaluation.server"
import { getExpenseFundForOrg } from "./expense-fund.queries.server"
import { fanoutClaimLifecycleEvent } from "./claim-notification.server"
import {
  findOrgDocumentForClaim,
  findOrgEmployeeForClaim,
  getClaimTypeForOrg,
  resolveClaimApproverUserId,
} from "./claim.queries.server"
import type {
  AttachClaimEvidenceFormState,
  CancelClaimFormState,
  SubmitClaimFormState,
} from "../../../types"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import { withPortalMutationSpan } from "../../../employee-management/employee-selfservice-portal/data/portal-mutation-tracing.server"

export function revalidateClaims() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/claims"), "layout")
  revalidatePath(toLocalePortalRevalidatePattern("/employee/claims"), "page")
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
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
  expenseFundId?: string | null
  duplicateOverrideReason?: string | null
  submissionMode: "self_service" | "on_behalf"
  /** When true, IAM audit uses `HRM_ESS_AUDIT.claim` (employee portal). */
  employeePortalAudit?: boolean
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

  const today = todayIso()
  const [employee, claimType, expenseFund] = await Promise.all([
    findOrgEmployeeForClaim(organizationId, input.employeeId),
    getClaimTypeForOrg(organizationId, input.claimTypeId),
    input.expenseFundId
      ? getExpenseFundForOrg(organizationId, input.expenseFundId)
      : Promise.resolve(null),
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
  if (input.expenseFundId && !expenseFund) {
    return hrmActionFailure({ form: "Expense fund not found." })
  }
  if (expenseFund && expenseFund.state !== "active") {
    return hrmActionFailure({ form: "Expense fund is not active." })
  }

  const claimCurrency = (input.currency ?? claimType.currency).toUpperCase()
  const reimbursementCurrency =
    expenseFund?.currency.toUpperCase() ?? claimType.currency.toUpperCase()

  if (
    claimCurrency !== claimType.currency.toUpperCase() &&
    claimCurrency !== reimbursementCurrency
  ) {
    return hrmActionFailure({
      currency: `Currency must match the claim type (${claimType.currency}) or fund (${reimbursementCurrency}).`,
    })
  }

  if (!isClaimDateInRange(input.claimDate, today)) {
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

  const claimId = crypto.randomUUID()
  const claimNumber = buildClaimNumber({ claimDate: input.claimDate, claimId })
  const approvalId = crypto.randomUUID()
  const now = new Date()

  const evaluation = await evaluateClaimSubmission({
    organizationId,
    employee: {
      ...employee,
      legalEntityCode: null,
    },
    claimType: {
      id: claimType.id,
      code: claimType.code,
      currency: claimType.currency,
      perClaimLimit,
      periodLimit,
      annualLimit,
      defaultPayoutMethod: claimType.defaultPayoutMethod || "payroll",
    },
    expenseFund,
    claimDate: input.claimDate,
    amount: input.amount,
    claimCurrency,
    claimNumber,
    today,
    evaluatedAt: now,
  })

  if (evaluation.validationFlags.some((flag) => flag.flag === "fx_rate_missing")) {
    return hrmActionFailure({
      currency: "No exchange rate is configured for this currency pair.",
    })
  }

  if (
    evaluation.duplicateReviewStatus === "flagged" &&
    !input.duplicateOverrideReason?.trim()
  ) {
    return hrmActionFailure({
      form: "A similar claim already exists. Provide an override reason to continue.",
    })
  }

  const hardPolicyBlock = evaluation.validationFlags.some(
    (flag) => flag.severity === "error" && flag.flag.startsWith("over_")
  )
  if (hardPolicyBlock && !evaluation.requiresExceptionApproval) {
    const first = evaluation.validationFlags.find((flag) => flag.severity === "error")
    return hrmActionFailure({
      amount: first?.message ?? "Claim exceeds configured policy limits.",
    })
  }

  const evidenceRequired = doesClaimRequireEvidence({
    amount: input.amount,
    requiresEvidence: claimType.requiresEvidence,
    evidenceRequiredAboveAmount,
  })
  const payoutMethod =
    evaluation.reimbursementMode === "petty_cash_fund"
      ? "payroll"
      : evaluation.reimbursementMode === "employee_ap"
        ? "ap"
        : claimType.defaultPayoutMethod || "payroll"
  const taxTreatment =
    expenseFund?.defaultTaxTreatment ??
    claimType.defaultTaxTreatment ??
    "non_taxable_reimbursement"
  const financeAccountCode =
    expenseFund?.defaultFinanceAccountCode ??
    claimType.defaultFinanceAccountCode
  const costCenterCode =
    expenseFund?.defaultCostCenterCode ?? claimType.defaultCostCenterCode
  const projectCode = expenseFund?.defaultProjectCode ?? null
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
    financeAccountCode,
    costCenterCode,
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
      currency: reimbursementCurrency,
      description: input.description,
      evidenceCount: 0,
      evidenceRequired,
      payoutMethod,
      financeAccountCode,
      costCenterCode,
      taxTreatment,
      policyVersion: input.policyVersion,
      requestedAt: now,
    }),
    claimNumber,
    policy: policySnapshot,
    expenseFundCode: expenseFund?.code ?? null,
    validationFlags: evaluation.validationFlags,
  }

  const duplicateReviewStatus =
    evaluation.duplicateReviewStatus === "flagged" &&
    input.duplicateOverrideReason?.trim()
      ? "overridden"
      : evaluation.duplicateReviewStatus

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
      currency: reimbursementCurrency,
      description: input.description,
      state: "submitted",
      submittedAt: now,
      submittedByUserId: userId,
      currentApprovalId: approvalId,
      policyVersion: input.policyVersion ?? expenseFund?.policyVersion ?? null,
      policySnapshot,
      payoutMethod,
      financeAccountCode,
      costCenterCode,
      projectCode,
      taxTreatment,
      expenseFundId: expenseFund?.id ?? null,
      reimbursementMode: evaluation.reimbursementMode,
      requestedAmount: String(input.amount),
      claimCurrency,
      reimbursementCurrency,
      fxRate: evaluation.fxSnapshot ? String(evaluation.fxSnapshot.rate) : null,
      fxRateAsOf: evaluation.fxSnapshot ? now : null,
      fxRateSource: evaluation.fxSnapshot?.rateSource ?? null,
      fxSnapshot: evaluation.fxSnapshot,
      eligibilitySnapshot: evaluation.eligibilitySnapshot,
      validationFlags: evaluation.validationFlags,
      requiresExceptionApproval: evaluation.requiresExceptionApproval,
      duplicateReviewStatus,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    if (evaluation.duplicateSignals.length > 0) {
      await tx.insert(hrmClaimDuplicateSignal).values(
        evaluation.duplicateSignals.map((signal) => ({
          id: crypto.randomUUID(),
          organizationId,
          claimId,
          signalKind: signal.signalKind,
          matchedClaimId: signal.matchedClaimId,
          score: String(signal.score),
          signalPayload: signal.signalPayload,
          reviewDecision:
            duplicateReviewStatus === "overridden" ? "override" : "pending",
          overrideReason: input.duplicateOverrideReason?.trim() ?? null,
          reviewedByUserId:
            duplicateReviewStatus === "overridden" ? userId : null,
          reviewedAt: duplicateReviewStatus === "overridden" ? now : null,
        }))
      )
    }
  })

  const notificationPayload = {
    claimId,
    claimNumber,
    claimTypeCode: claimType.code,
    claimDate: input.claimDate,
    amount: String(input.amount),
    currency: reimbursementCurrency,
    state: "submitted",
    expenseFundCode: expenseFund?.code ?? null,
    requiresExceptionApproval: evaluation.requiresExceptionApproval,
  }

  const portalAudit = input.employeePortalAudit === true

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: resolveClaimSubmitAuditAction(portalAudit),
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
        currency: reimbursementCurrency,
        claimCurrency,
        submissionMode: input.submissionMode,
        currentApproverUserId,
        evidenceRequired,
        payoutMethod,
        duplicateReviewStatus,
        requiresExceptionApproval: evaluation.requiresExceptionApproval,
        expenseFundCode: expenseFund?.code ?? null,
      },
    })

    if (duplicateReviewStatus === "overridden") {
      await writeIamAuditEventFromNextHeaders({
        action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.overrideDuplicate,
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_claim",
        resourceId: claimId,
        metadata: {
          claimNumber,
          duplicateSignalCount: evaluation.duplicateSignals.length,
        },
      })
    }

    await writeIamAuditEventFromNextHeaders({
      action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.approval.request,
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

    await fanoutClaimLifecycleEvent({
      organizationId,
      eventType: HRM_CLAIM_EVENT_TYPES.submitted,
      payload: notificationPayload,
      now,
    })
    if (currentApproverUserId) {
      await fanoutClaimLifecycleEvent({
        organizationId,
        eventType: HRM_CLAIM_EVENT_TYPES.underReview,
        payload: notificationPayload,
        now,
      })
    }
    if (evaluation.requiresExceptionApproval) {
      await fanoutClaimLifecycleEvent({
        organizationId,
        eventType: HRM_CLAIM_EVENT_TYPES.exceptionRequested,
        payload: notificationPayload,
        now,
      })
    }
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
      action: resolveClaimCancelAuditAction(true),
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
        action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.approval.cancel,
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
      action: resolveClaimAttachEvidenceAuditAction(true),
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
