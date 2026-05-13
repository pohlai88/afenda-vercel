"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmClaim } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
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
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
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
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
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
