"use server"

import { after } from "next/server"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmClaim, hrmClaimDuplicateSignal } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { HRM_EXPENSE_REIMBURSEMENT_AUDIT } from "../expense-reimbursement.contract"
import { claimDuplicateOverrideSchema } from "../schema/claim.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { ClaimApprovalFormState } from "../../../types"

function revalidateClaims() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/claims"), "layout")
}

/**
 * Post-submit duplicate override — updates pending signals and claim review status.
 */
export async function overrideDuplicateClaimAction(
  _prev: ClaimApprovalFormState | undefined,
  formData: FormData
): Promise<ClaimApprovalFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const parsed = claimDuplicateOverrideSchema.safeParse({
    claimId: formData.get("claimId"),
    overrideReason: formData.get("overrideReason"),
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimId: errs.claimId?.[0],
      form: errs.overrideReason?.[0] ?? parsed.error.issues[0]?.message,
    })
  }

  const { claimId, overrideReason } = parsed.data

  const canOverride = await canUseErpPermission({
    organizationId,
    userId,
    permission: { module: "hrm", object: "claim", function: "update" },
  })
  if (!canOverride) {
    return hrmActionFailure({
      form: "HRM claim update permission required to override duplicate review.",
    })
  }

  const claim = await db.query.hrmClaim.findFirst({
    where: and(
      eq(hrmClaim.id, claimId),
      eq(hrmClaim.organizationId, organizationId)
    ),
    columns: {
      id: true,
      claimNumber: true,
      duplicateReviewStatus: true,
      state: true,
    },
  })

  if (!claim) {
    return hrmActionFailure({ claimId: "Claim not found." })
  }

  if (claim.duplicateReviewStatus !== "flagged") {
    return hrmActionFailure({
      claimId: "Only claims flagged for duplicate review can be overridden.",
    })
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmClaim)
      .set({
        duplicateReviewStatus: "overridden",
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmClaim.id, claimId))

    await tx
      .update(hrmClaimDuplicateSignal)
      .set({
        reviewDecision: "override",
        overrideReason,
        reviewedByUserId: userId,
        reviewedAt: now,
      })
      .where(
        and(
          eq(hrmClaimDuplicateSignal.organizationId, organizationId),
          eq(hrmClaimDuplicateSignal.claimId, claimId)
        )
      )
  })

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.overrideDuplicate,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_claim",
      resourceId: claimId,
      metadata: {
        claimNumber: claim.claimNumber,
        overrideReason,
      },
    })
  })

  revalidateClaims()
  return { ok: true, claimId }
}
