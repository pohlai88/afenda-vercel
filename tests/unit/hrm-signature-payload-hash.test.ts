import { describe, expect, it } from "vitest"

import { hashStableSignatureEnvelope } from "../../lib/features/tools/electronic-signatures/data/signature-envelope.shared.ts"
import type { SignedEnvelopeV1 } from "../../lib/features/tools/electronic-signatures/schemas/signature.schema"

const BASE_ENVELOPE = {
  version: "1",
  signatureRequestId: "req-1",
  organizationId: "org-1",
  subject: {
    type: "contract",
    id: "contract-1",
    summary: { label: "Contract" },
  },
  sourceDocument: { id: "doc-1", sha256: "a".repeat(64) },
  declaration: { textSha256: "b".repeat(64), locale: "en" },
  parties: [
    {
      partyId: "p2",
      order: 2,
      employeeId: null,
      email: "b@example.com",
      displayName: "B",
      signedAt: "2026-05-16T10:00:00.000Z",
      intent: { ip: null, userAgent: null, locale: "en" },
      typedName: "B",
      drawnSignatureSha256: null,
    },
    {
      partyId: "p1",
      order: 1,
      employeeId: "e1",
      email: "a@example.com",
      displayName: "A",
      signedAt: "2026-05-16T09:00:00.000Z",
      intent: { ip: null, userAgent: null, locale: "en" },
      typedName: "A",
      drawnSignatureSha256: null,
    },
  ],
  ceremonyCompletedAt: "2026-05-16T11:00:00.000Z",
} as const satisfies SignedEnvelopeV1

describe("hashStableSignatureEnvelope", () => {
  it("is stable regardless of party array order", () => {
    const reversed = {
      ...BASE_ENVELOPE,
      parties: [...BASE_ENVELOPE.parties].reverse(),
    } satisfies SignedEnvelopeV1
    expect(hashStableSignatureEnvelope(BASE_ENVELOPE)).toBe(
      hashStableSignatureEnvelope(reversed)
    )
  })

  it("changes when ceremony content changes", () => {
    const alt = {
      ...BASE_ENVELOPE,
      ceremonyCompletedAt: "2026-05-16T12:00:00.000Z",
    } satisfies SignedEnvelopeV1
    expect(hashStableSignatureEnvelope(BASE_ENVELOPE)).not.toBe(
      hashStableSignatureEnvelope(alt)
    )
  })
})
