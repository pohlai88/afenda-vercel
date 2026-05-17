import "server-only"

import {
  deliverEventNow,
  findEnabledEndpointForEventType,
  getOrgEventEndpointSigningKey,
  type OrgEventEnvelope,
} from "#features/org-admin/server"

import type { SignatureEventType } from "../schemas/signature.schema"
import { SIGNATURE_EVENT_TO_WEBHOOK_EVENT } from "./signature-event-types.shared"

export async function triggerSignatureWebhook(input: {
  readonly organizationId: string
  readonly requestId: string
  readonly eventType: SignatureEventType
  readonly data?: Record<string, unknown>
}): Promise<void> {
  const webhookEvent = SIGNATURE_EVENT_TO_WEBHOOK_EVENT[input.eventType]
  if (!webhookEvent) {
    return
  }

  try {
    const endpoint = await findEnabledEndpointForEventType(
      input.organizationId,
      webhookEvent
    )
    if (!endpoint) {
      return
    }

    const signingKey = await getOrgEventEndpointSigningKey({
      organizationId: input.organizationId,
      endpointId: endpoint.id,
    })
    if (!signingKey) {
      return
    }

    const envelope: OrgEventEnvelope = {
      id: crypto.randomUUID(),
      type: webhookEvent,
      occurredAt: new Date().toISOString(),
      organizationId: input.organizationId,
      data: {
        signatureRequestId: input.requestId,
        ...(input.data ?? {}),
      },
    }

    await deliverEventNow({
      endpoint,
      signingKey,
      envelope,
    })
  } catch {
    // Best-effort outbound fanout — ceremony completion must not fail on delivery errors.
  }
}
