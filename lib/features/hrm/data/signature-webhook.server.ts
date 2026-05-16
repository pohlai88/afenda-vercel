import "server-only"

import type { SignatureEventType } from "../schemas/signature.schema"
import { SIGNATURE_EVENT_TO_WEBHOOK_EVENT } from "./signature-event-types.shared"

/**
 * Phase 1: no-op when no org_event_endpoint is configured.
 * Phase 2: enqueue via `org_event_delivery` using the mapped webhook event name.
 */
export async function triggerSignatureWebhook(input: {
  readonly organizationId: string
  readonly requestId: string
  readonly eventType: SignatureEventType
}): Promise<void> {
  void SIGNATURE_EVENT_TO_WEBHOOK_EVENT[input.eventType]
  void input.organizationId
  void input.requestId
}
