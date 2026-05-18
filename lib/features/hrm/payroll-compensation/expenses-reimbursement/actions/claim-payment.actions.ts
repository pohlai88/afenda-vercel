"use server"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import {
  HRM_CLAIM_EVENT_TYPES,
  HRM_EXPENSE_REIMBURSEMENT_AUDIT,
} from "../expense-reimbursement.contract"
import { recordClaimApTreasuryPayment } from "../data/claim-ap-payment.server"
import { fanoutClaimLifecycleEvent } from "../data/claim-notification.server"
import { findClaimNotificationPayload } from "../data/claim.queries.server"
import { recordClaimApPaymentFormSchema } from "../schema/claim.schema"
import { revalidateClaims } from "../data/claim-submission-mutation.server"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ClaimApprovalFormState } from "../../../types"

/**
 * Tier B — records treasury payment for an approved AP-routed claim.
 * Marks the claim `paid` and posts the payment journal (clear AP · credit cash).
 */
export async function recordClaimApPaymentAction(
  _prev: ClaimApprovalFormState | undefined,
  formData: FormData
): Promise<ClaimApprovalFormState> {
  const gate = await requireHrmPermission({
    object: "claim",
    function: "update",
    errorMessage: "HRM claim update permission required for treasury payment.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = recordClaimApPaymentFormSchema.safeParse({
    claimId: formData.get("claimId"),
    treasuryPaymentReference: formData.get("treasuryPaymentReference"),
    paidAmount: formData.get("paidAmount") || undefined,
    cashAccountCode: formData.get("cashAccountCode") || null,
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimId: fieldErrors.claimId?.[0],
      form:
        fieldErrors.treasuryPaymentReference?.[0] ??
        fieldErrors.paidAmount?.[0] ??
        parsed.error.issues[0]?.message,
    })
  }

  const now = new Date()
  const result = await recordClaimApTreasuryPayment({
    organizationId,
    claimId: parsed.data.claimId,
    treasuryPaymentReference: parsed.data.treasuryPaymentReference,
    paidAmount: parsed.data.paidAmount,
    cashAccountCode: parsed.data.cashAccountCode,
    paidByUserId: userId,
    paidAt: now,
  })

  if (result.code === "not_found") {
    return hrmActionFailure({ claimId: "Claim not found." })
  }
  if (result.code === "invalid_state" || result.code === "not_ap_route") {
    return hrmActionFailure({ form: result.message })
  }
  if (result.code === "accrual_missing" || result.code === "invalid_amount") {
    return hrmActionFailure({ form: result.message })
  }
  if (result.code === "already_paid") {
    return { ok: true, claimId: result.claimId }
  }

  const notificationPayload =
    (await findClaimNotificationPayload({
      organizationId,
      claimId: result.claimId,
      state: "paid",
    })) ?? {
      claimId: result.claimId,
      claimNumber: null,
      claimTypeCode: "claim",
      claimDate: "",
      amount:
        parsed.data.paidAmount != null ? String(parsed.data.paidAmount) : "0",
      currency: "",
      state: "paid",
      expenseFundCode: null,
      requiresExceptionApproval: false,
    }

  after(async () => {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.paid,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_claim",
      resourceId: result.claimId,
      metadata: {
        payoutMethod: "ap",
        treasuryPaymentReference: result.treasuryPaymentReference,
        paymentJournalId: result.paymentJournalId,
      },
    })
    await fanoutClaimLifecycleEvent({
      organizationId,
      eventType: HRM_CLAIM_EVENT_TYPES.paid,
      payload: notificationPayload,
      now,
    })
  })

  revalidateClaims()
  return { ok: true, claimId: result.claimId }
}
