import { createHash } from "node:crypto"

import { stableJsonStringify } from "#lib/erp/stable-json.shared"
import type { SignedEnvelopeV1 } from "../schemas/signature.schema"

export function hashStableSignatureEnvelope(
  envelope: SignedEnvelopeV1
): string {
  const canonical = {
    ...envelope,
    parties: [...envelope.parties].sort((a, b) => a.order - b.order),
  }
  return createHash("sha256")
    .update(stableJsonStringify(canonical))
    .digest("hex")
}

export function payloadHashSuffix(payloadHash: string): string {
  return payloadHash.slice(-12)
}
