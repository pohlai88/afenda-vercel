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
import { requireOrgSession } from "#lib/tenant"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  claimPolicySnapshotFromUnknown,
  doesClaimRequireEvidence,
} from "../data/claim-helpers.shared"
import { isClaimAssignedApprover } from "../data/claim.queries.server"
import {
  claimApprovalDecisionSchema,
  claimRejectDecisionSchema,
} from "../schemas/claim.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { ClaimApprovalFormState } from "../types"

function revalidateClaims() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/claims"), "layout")
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/employees/[employeeId]"),
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
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({
      claimId: parsed.error.issues[0]?.message,
    })
  }

  const { claimId, decisionNote } = parsed.data

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

  const [claimType, evidenceCount] = await Promise.all([
    db.query.hrmClaimType.findFirst({
      where: and(
        eq(hrmClaimType.organizationId, organizationId),
        eq(hrmClaimType.id, claim.claimTypeId)
      ),
      columns: {
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
      requiresEvidence: claimType?.requiresEvidence ?? false,
      evidenceRequiredAboveAmount:
        claimType?.evidenceRequiredAboveAmount != null
          ? Number(claimType.evidenceRequiredAboveAmount)
          : null,
    })
  if (evidenceRequired && evidenceCount === 0) {
    return hrmActionFailure({
      claimId: "Evidence is required before this claim can be approved.",
    })
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmClaim)
      .set({
        state: "approved",
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
          state: "approved",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, claim.currentApprovalId))
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.approve",
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
    },
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

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.reject",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: claim.currentApprovalId ?? claimId,
    metadata: {
      subjectKind: "claim",
      subjectId: claimId,
      employeeId: claim.employeeId,
      rejectedReason,
    },
  })

  revalidateClaims()
  return { ok: true, claimId }
}
