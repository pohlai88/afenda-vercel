import "server-only"

import {
  deliverEventNow,
  findEnabledEndpointForEventType,
  getOrgEventEndpointSigningKey,
  type OrgEventEnvelope,
} from "#features/org-admin/server"

import type { HRM_CLAIM_EVENT_TYPES } from "../expense-reimbursement.contract"

export type ClaimNotificationEventType =
  (typeof HRM_CLAIM_EVENT_TYPES)[keyof typeof HRM_CLAIM_EVENT_TYPES]

export type ClaimNotificationPayload = {
  readonly claimId: string
  readonly claimNumber: string | null
  readonly claimTypeCode: string
  readonly claimDate: string
  readonly amount: string
  readonly currency: string
  readonly state: string
  readonly expenseFundCode: string | null
  readonly requiresExceptionApproval: boolean
}

export function buildClaimNotificationEnvelopeData(
  payload: ClaimNotificationPayload
): Record<string, unknown> {
  return {
    claimId: payload.claimId,
    claimNumber: payload.claimNumber,
    claimTypeCode: payload.claimTypeCode,
    claimDate: payload.claimDate,
    amount: payload.amount,
    currency: payload.currency,
    state: payload.state,
    expenseFundCode: payload.expenseFundCode,
    requiresExceptionApproval: payload.requiresExceptionApproval,
  }
}

export type ClaimNotificationOutcome =
  | { readonly code: "delivered"; readonly deliveryId: string }
  | {
      readonly code: "delivery_failed"
      readonly deliveryId: string
      readonly httpStatus: number | null
    }
  | { readonly code: "endpoint_not_configured" }
  | { readonly code: "signing_key_missing" }
  | { readonly code: "fanout_error"; readonly message: string }

/**
 * Best-effort claim lifecycle fanout via `org_event_delivery`.
 * Operational facets only — no employee PII in the envelope.
 */
export async function fanoutClaimLifecycleEvent(input: {
  readonly organizationId: string
  readonly eventType: ClaimNotificationEventType
  readonly payload: ClaimNotificationPayload
  readonly now: Date
}): Promise<ClaimNotificationOutcome> {
  try {
    const endpoint = await findEnabledEndpointForEventType(
      input.organizationId,
      input.eventType
    )
    if (!endpoint) return { code: "endpoint_not_configured" }

    const signingKey = await getOrgEventEndpointSigningKey({
      organizationId: input.organizationId,
      endpointId: endpoint.id,
    })
    if (!signingKey) return { code: "signing_key_missing" }

    const envelope: OrgEventEnvelope = {
      id: crypto.randomUUID(),
      type: input.eventType,
      occurredAt: input.now.toISOString(),
      organizationId: input.organizationId,
      data: buildClaimNotificationEnvelopeData(input.payload),
    }

    const { delivery, result } = await deliverEventNow({
      endpoint,
      signingKey,
      envelope,
    })

    if (result.state === "delivered") {
      return { code: "delivered", deliveryId: delivery.id }
    }

    return {
      code: "delivery_failed",
      deliveryId: delivery.id,
      httpStatus: result.httpStatus,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown fanout error"
    return { code: "fanout_error", message }
  }
}
