"use server"

import { after } from "next/server"
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
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  HRM_CLAIM_EVENT_TYPES,
  HRM_EXPENSE_REIMBURSEMENT_AUDIT,
} from "../expense-reimbursement.contract"
import {
  claimPolicySnapshotFromUnknown,
  doesClaimRequireEvidence,
} from "../data/claim-helpers.shared"
import { postApprovedClaimToApJournal } from "../data/claim-ap-posting.server"
import { fanoutClaimLifecycleEvent } from "../data/claim-notification.server"
import { deductExpenseFundBalanceOnApprove } from "../data/claim-fund-balance.server"
import { isClaimAssignedApprover } from "../data/claim.queries.server"
import {
  claimApprovalDecisionSchema,
  claimRejectDecisionSchema,
  claimReturnDecisionSchema,
} from "../schema/claim.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ClaimApprovalFormState } from "../../../types"

function revalidateClaims() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/claims"), "layout")
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/employees/[employeeId]"),
    "page"
  )
}

async function canDecideClaim(input: {
  organizationId: string
  userId: string
  currentApprovalId: string | null
}): Promise<boolean> {
  if (await isClaimAssignedApprover(input)) return true

  return canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: { module: "hrm", object: "claim", function: "update" },
  })
}

async function countClaimEvidence(input: {
  organizationId: string
  claimId: string
}): Promise<number> {
  const rows = await db
    .select({ id: hrmClaimEvidence.id })
    .from(hrmClaimEvidence)
    .where(
      and(
        eq(hrmClaimEvidence.organizationId, input.organizationId),
        eq(hrmClaimEvidence.claimId, input.claimId)
      )
    )
  return rows.length
}

// ---------------------------------------------------------------------------
// Tier B — approve claim
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — approves a submitted claim.
 *
 * Transitions: `hrm_claim` submitted→approved; `hrm_approval` pending→approved.
 * Audit: `erp.hrm.approval.approve` (the claim row is then payable by
 * payroll-finalize.workflow.ts in PR 5).
 */
export async function approveClaimAction(
  _prev: ClaimApprovalFormState | undefined,
  formData: FormData
): Promise<ClaimApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = claimApprovalDecisionSchema.safeParse({
    claimId: formData.get("claimId"),
    approvedAmount: formData.get("approvedAmount") || undefined,
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimId: errs.claimId?.[0],
      approvedAmount: errs.approvedAmount?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { claimId, decisionNote, approvedAmount } = parsed.data

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
      claimTypeId: true,
      amount: true,
      currency: true,
      claimNumber: true,
      claimDate: true,
      requiresExceptionApproval: true,
      expenseFundId: true,
      reimbursementMode: true,
      payoutMethod: true,
      financeAccountCode: true,
      costCenterCode: true,
      policySnapshot: true,
      submittedByUserId: true,
      createdByUserId: true,
    },
  })

  if (!claim) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }

  if (claim.state !== "submitted") {
    return hrmActionFailure({
      claimId: `Cannot approve a claim with state "${claim.state}". Expected "submitted".`,
    })
  }

  if (claim.submittedByUserId === userId || claim.createdByUserId === userId) {
    return hrmActionFailure({
      form: "Maker-checker policy blocks approving your own claim.",
    })
  }

  const allowed = await canDecideClaim({
    organizationId,
    userId,
    currentApprovalId: claim.currentApprovalId,
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "Only the assigned approver or HRM claim administrator can approve this claim.",
    })
  }

  const [claimTypeRow, evidenceCount] = await Promise.all([
    db.query.hrmClaimType.findFirst({
      where: and(
        eq(hrmClaimType.organizationId, organizationId),
        eq(hrmClaimType.id, claim.claimTypeId)
      ),
      columns: {
        code: true,
        requiresEvidence: true,
        evidenceRequiredAboveAmount: true,
      },
    }),
    countClaimEvidence({ organizationId, claimId }),
  ])

  const storedPolicySnapshot = claimPolicySnapshotFromUnknown(
    claim.policySnapshot
  )
  const evidenceRequired =
    storedPolicySnapshot?.evidenceRequired ??
    doesClaimRequireEvidence({
      amount: Number(claim.amount),
      requiresEvidence: claimTypeRow?.requiresEvidence ?? false,
      evidenceRequiredAboveAmount:
        claimTypeRow?.evidenceRequiredAboveAmount != null
          ? Number(claimTypeRow.evidenceRequiredAboveAmount)
          : null,
    })
  if (evidenceRequired && evidenceCount === 0) {
    return hrmActionFailure({
      claimId: "Evidence is required before this claim can be approved.",
    })
  }

  const requestedAmount = Number(claim.amount)
  const resolvedApprovedAmount = approvedAmount ?? requestedAmount
  if (resolvedApprovedAmount > requestedAmount) {
    return hrmActionFailure({
      approvedAmount: "Approved amount cannot exceed the requested amount.",
    })
  }
  const rejectedAmount = requestedAmount - resolvedApprovedAmount

  if (claim.requiresExceptionApproval) {
    const canException = await canUseErpPermission({
      organizationId,
      userId,
      permission: { module: "hrm", object: "claim", function: "update" },
    })
    if (!canException) {
      return hrmActionFailure({
        form: "This claim requires exception approval authority.",
      })
    }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmClaim)
      .set({
        state: "approved",
        approvedAmount: String(resolvedApprovedAmount),
        rejectedAmount: String(rejectedAmount),
        decidedByUserId: userId,
        decidedAt: now,
        updatedAt: now,
        updatedByUserId: userId,
        ...(claim.requiresExceptionApproval
          ? {
              exceptionApprovedByUserId: userId,
              exceptionApprovedAt: now,
            }
          : {}),
      })
      .where(eq(hrmClaim.id, claimId))

    if (claim.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "approved",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, claim.currentApprovalId))
    }

    if (claim.reimbursementMode === "petty_cash_fund" && claim.expenseFundId) {
      await deductExpenseFundBalanceOnApprove(tx, {
        organizationId,
        expenseFundId: claim.expenseFundId,
        approvedAmount: resolvedApprovedAmount,
        updatedByUserId: userId,
        now,
      })
    }
  })

  let apPostingJournalId: string | null = null
  if (claim.payoutMethod === "ap") {
    const apResult = await postApprovedClaimToApJournal({
      organizationId,
      claimId,
      claimNumber: claim.claimNumber,
      approvedAmount: resolvedApprovedAmount,
      currency: claim.currency,
      financeAccountCode: claim.financeAccountCode,
      costCenterCode: claim.costCenterCode,
      postedByUserId: userId,
    })
    if (apResult.code === "invalid_amount") {
      return hrmActionFailure({ form: apResult.message })
    }
    if (apResult.code === "posted" || apResult.code === "already_posted") {
      apPostingJournalId = apResult.journalId
      const paymentReference =
        apResult.code === "posted"
          ? apResult.reference
          : apResult.journalId
      await db
        .update(hrmClaim)
        .set({
          paymentReference,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmClaim.id, claimId))
    }
  }

  const notificationPayload = {
    claimId,
    claimNumber: claim.claimNumber,
    claimTypeCode: claimTypeRow?.code ?? "claim",
    claimDate: claim.claimDate,
    amount: String(resolvedApprovedAmount),
    currency: claim.currency,
    state: "approved",
    expenseFundCode: null,
    requiresExceptionApproval: claim.requiresExceptionApproval,
  }

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.approval.approve,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_approval",
      resourceId: claim.currentApprovalId ?? claimId,
      metadata: {
        subjectKind: "claim",
        subjectId: claimId,
        employeeId: claim.employeeId,
        evidenceCount,
        approvedAmount: resolvedApprovedAmount,
        rejectedAmount,
      },
    })
    if (claim.requiresExceptionApproval) {
      await writeIamAuditEventFromNextHeaders({
        action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.grantException,
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_claim",
        resourceId: claimId,
        metadata: {
          claimNumber: claim.claimNumber,
          approvedAmount: resolvedApprovedAmount,
        },
      })
    }
    if (apPostingJournalId) {
      await writeIamAuditEventFromNextHeaders({
        action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.apPosted,
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "hrm_claim",
        resourceId: claimId,
        metadata: {
          claimNumber: claim.claimNumber,
          journalId: apPostingJournalId,
          payoutMethod: "ap",
          approvedAmount: resolvedApprovedAmount,
        },
      })
    }
    await fanoutClaimLifecycleEvent({
      organizationId,
      eventType: HRM_CLAIM_EVENT_TYPES.approved,
      payload: notificationPayload,
      now,
    })
  })

  revalidateClaims()
  return { ok: true, claimId }
}

export async function returnClaimAction(
  _prev: ClaimApprovalFormState | undefined,
  formData: FormData
): Promise<ClaimApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = claimReturnDecisionSchema.safeParse({
    claimId: formData.get("claimId"),
    returnedReason: formData.get("returnedReason"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimId: errs.claimId?.[0],
      returnedReason: errs.returnedReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { claimId, returnedReason, decisionNote } = parsed.data

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
      claimNumber: true,
      claimDate: true,
      amount: true,
      currency: true,
      claimTypeId: true,
      requiresExceptionApproval: true,
      submittedByUserId: true,
      createdByUserId: true,
    },
  })

  if (!claim) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }
  if (claim.state !== "submitted") {
    return hrmActionFailure({
      claimId: `Cannot return a claim with state "${claim.state}". Expected "submitted".`,
    })
  }

  const allowed = await canDecideClaim({
    organizationId,
    userId,
    currentApprovalId: claim.currentApprovalId,
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "Only the assigned approver or HRM claim administrator can return this claim.",
    })
  }

  const claimType = await db.query.hrmClaimType.findFirst({
    where: and(
      eq(hrmClaimType.organizationId, organizationId),
      eq(hrmClaimType.id, claim.claimTypeId)
    ),
    columns: { code: true },
  })

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmClaim)
      .set({
        state: "returned",
        returnedReason,
        currentApprovalId: null,
        decidedByUserId: userId,
        decidedAt: now,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmClaim.id, claimId))

    if (claim.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "cancelled",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote: decisionNote ?? returnedReason,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, claim.currentApprovalId))
    }
  })

  const notificationPayload = {
    claimId,
    claimNumber: claim.claimNumber,
    claimTypeCode: claimType?.code ?? "claim",
    claimDate: claim.claimDate,
    amount: claim.amount,
    currency: claim.currency,
    state: "returned",
    expenseFundCode: null,
    requiresExceptionApproval: claim.requiresExceptionApproval,
  }

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.return,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_claim",
      resourceId: claimId,
      metadata: {
        subjectKind: "claim",
        subjectId: claimId,
        employeeId: claim.employeeId,
        returnedReason,
      },
    })
    await fanoutClaimLifecycleEvent({
      organizationId,
      eventType: HRM_CLAIM_EVENT_TYPES.returned,
      payload: notificationPayload,
      now,
    })
  })

  revalidateClaims()
  return { ok: true, claimId }
}

// ---------------------------------------------------------------------------
// Tier B — reject claim
// ---------------------------------------------------------------------------

/**
 * Tier B (admin-gated) — rejects a submitted claim.
 *
 * Transitions: `hrm_claim` submitted→rejected; `hrm_approval` pending→rejected.
 * Audit: `erp.hrm.approval.reject`. Rejected reason is required and stored
 * on the claim for the operator-facing 7W1H summary.
 */
export async function rejectClaimAction(
  _prev: ClaimApprovalFormState | undefined,
  formData: FormData
): Promise<ClaimApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = claimRejectDecisionSchema.safeParse({
    claimId: formData.get("claimId"),
    rejectedReason: formData.get("rejectedReason"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimId: errs.claimId?.[0],
      rejectedReason: errs.rejectedReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { claimId, rejectedReason, decisionNote } = parsed.data

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
      createdByUserId: true,
    },
  })

  if (!claim) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }

  if (claim.state !== "submitted") {
    return hrmActionFailure({
      claimId: `Cannot reject a claim with state "${claim.state}". Expected "submitted".`,
    })
  }

  if (claim.submittedByUserId === userId || claim.createdByUserId === userId) {
    return hrmActionFailure({
      form: "Maker-checker policy blocks rejecting your own claim.",
    })
  }

  const allowed = await canDecideClaim({
    organizationId,
    userId,
    currentApprovalId: claim.currentApprovalId,
  })
  if (!allowed) {
    return hrmActionFailure({
      form: "Only the assigned approver or HRM claim administrator can reject this claim.",
    })
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmClaim)
      .set({
        state: "rejected",
        rejectedReason,
        decidedByUserId: userId,
        decidedAt: now,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmClaim.id, claimId))

    if (claim.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "rejected",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, claim.currentApprovalId))
    }
  })

  const claimMeta = await db.query.hrmClaim.findFirst({
    where: eq(hrmClaim.id, claimId),
    columns: {
      claimNumber: true,
      claimDate: true,
      amount: true,
      currency: true,
      claimTypeId: true,
      requiresExceptionApproval: true,
    },
  })
  const claimTypeRow = claimMeta
    ? await db.query.hrmClaimType.findFirst({
        where: and(
          eq(hrmClaimType.organizationId, organizationId),
          eq(hrmClaimType.id, claimMeta.claimTypeId)
        ),
        columns: { code: true },
      })
    : null

  const notificationPayload = {
    claimId,
    claimNumber: claimMeta?.claimNumber ?? null,
    claimTypeCode: claimTypeRow?.code ?? "claim",
    claimDate: claimMeta?.claimDate ?? "",
    amount: claimMeta?.amount ?? "0",
    currency: claimMeta?.currency ?? "",
    state: "rejected",
    expenseFundCode: null,
    requiresExceptionApproval: claimMeta?.requiresExceptionApproval ?? false,
  }

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.reject,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_claim",
      resourceId: claimId,
      metadata: {
        subjectKind: "claim",
        subjectId: claimId,
        employeeId: claim.employeeId,
        rejectedReason,
      },
    })
    await fanoutClaimLifecycleEvent({
      organizationId,
      eventType: HRM_CLAIM_EVENT_TYPES.rejected,
      payload: notificationPayload,
      now,
    })
  })

  revalidateClaims()
  return { ok: true, claimId }
}
