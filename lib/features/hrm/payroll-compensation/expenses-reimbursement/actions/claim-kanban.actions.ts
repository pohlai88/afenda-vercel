"use server"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { requireOrgSession, writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmClaim } from "#lib/db/schema"
import { canUseErpPermission } from "#features/erp-rbac/server"
import {
  buildKanbanWorkflowFromColumnTransitions,
  isKanbanTransitionAllowed,
} from "#features/governed-surface/kanban-workflow.shared"

import { isClaimCancellable } from "../data/claim-helpers.shared"
import {
  CLAIM_KANBAN_COLUMN_TRANSITIONS,
  isClaimKanbanColumnId,
} from "../data/claim-kanban-workflow.shared"
import { revalidateClaims } from "../data/claim-submission-mutation.server"
import { HRM_EXPENSE_REIMBURSEMENT_AUDIT } from "../expense-reimbursement.contract"

const moveClaimKanbanCardSchema = z.object({
  claimId: z.string().uuid(),
  toColumnId: z.string(),
})

export type MoveClaimKanbanCardResult =
  | { ok: true }
  | { ok: false; error: string }

export async function moveClaimKanbanCardAction(
  claimId: string,
  toColumnId: string
): Promise<MoveClaimKanbanCardResult> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = moveClaimKanbanCardSchema.safeParse({ claimId, toColumnId })
  if (!parsed.success) {
    return { ok: false, error: "Invalid move request." }
  }

  if (!isClaimKanbanColumnId(parsed.data.toColumnId)) {
    return { ok: false, error: "Unknown column." }
  }

  const canManage = await canUseErpPermission({
    organizationId,
    userId,
    permission: { module: "hrm", object: "claim", function: "update" },
  })
  if (!canManage) {
    return { ok: false, error: "You do not have permission to move claims." }
  }

  const claim = await db.query.hrmClaim.findFirst({
    where: and(
      eq(hrmClaim.id, parsed.data.claimId),
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
    return { ok: false, error: "Claim not found." }
  }

  const workflow = buildKanbanWorkflowFromColumnTransitions(
    CLAIM_KANBAN_COLUMN_TRANSITIONS
  )

  if (
    !isClaimKanbanColumnId(claim.state) ||
    !isKanbanTransitionAllowed(workflow, claim.state, parsed.data.toColumnId)
  ) {
    return { ok: false, error: "That move is not allowed on the board." }
  }

  if (parsed.data.toColumnId !== "cancelled") {
    return {
      ok: false,
      error: "Use the pending inbox or claim detail for approvals and returns.",
    }
  }

  if (!isClaimCancellable(claim.state)) {
    return {
      ok: false,
      error: `Cannot cancel a claim with state "${claim.state}".`,
    }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmClaim)
      .set({
        state: "cancelled",
        cancelledAt: now,
        cancelledReason: null,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmClaim.id, parsed.data.claimId))

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
            decisionNote: "Claim cancelled from kanban.",
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
    resourceId: parsed.data.claimId,
    metadata: {
      previousState: claim.state,
      employeeId: claim.employeeId,
      source: "kanban_drag",
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
      metadata: { subjectKind: "claim", subjectId: parsed.data.claimId },
    })
  }

  revalidateClaims()
  return { ok: true }
}
