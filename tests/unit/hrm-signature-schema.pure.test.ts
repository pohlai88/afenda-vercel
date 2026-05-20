import { describe, expect, it } from "vitest"

import { signedEnvelopeV1Schema, zSignatureEventDataV1 } from "#features/tools"

describe("signedEnvelopeV1Schema", () => {
  it("accepts a minimal valid envelope", () => {
    const parsed = signedEnvelopeV1Schema.safeParse({
      version: "1",
      signatureRequestId: "req-1",
      organizationId: "org-1",
      subject: {
        type: "contract",
        id: "contract-1",
        summary: { label: "Employment contract" },
      },
      sourceDocument: {
        id: "doc-1",
        sha256: "a".repeat(64),
      },
      declaration: {
        textSha256: "b".repeat(64),
        locale: "en",
      },
      parties: [
        {
          partyId: "party-1",
          order: 1,
          employeeId: "emp-1",
          email: "jane@example.com",
          displayName: "Jane Doe",
          signedAt: new Date().toISOString(),
          intent: { ip: null, userAgent: null, locale: "en" },
          typedName: "Jane Doe",
          drawnSignatureSha256: null,
        },
      ],
      ceremonyCompletedAt: new Date().toISOString(),
    })
    expect(parsed.success).toBe(true)
  })
})

describe("zSignatureEventDataV1", () => {
  it("parses created payload with pinned declaration text", () => {
    const parsed = zSignatureEventDataV1.safeParse({
      type: "signature_request.created",
      requestId: "req-1",
      organizationId: "org-1",
      data: {
        kind: "contract",
        subjectId: "contract-1",
        declarationText: "I agree to the terms.",
      },
    })
    expect(parsed.success).toBe(true)
  })

  it("parses recipient_completed payload", () => {
    const parsed = zSignatureEventDataV1.safeParse({
      type: "signature_request.recipient_completed",
      requestId: "req-1",
      organizationId: "org-1",
      data: {
        partyId: "party-1",
        recipientEmail: "jane@example.com",
        typedName: "Jane Doe",
        drawnSignatureSha256: null,
        declarationTextHash: "c".repeat(64),
      },
    })
    expect(parsed.success).toBe(true)
  })

  it("parses consent.presented and consent.accepted payloads", () => {
    const presented = zSignatureEventDataV1.safeParse({
      type: "consent.presented",
      requestId: "req-1",
      organizationId: "org-1",
      data: { partyId: "party-1", recipientEmail: "jane@example.com" },
    })
    const accepted = zSignatureEventDataV1.safeParse({
      type: "consent.accepted",
      requestId: "req-1",
      organizationId: "org-1",
      data: {
        partyId: "party-1",
        recipientEmail: "jane@example.com",
        consentAt: new Date().toISOString(),
      },
    })
    expect(presented.success).toBe(true)
    expect(accepted.success).toBe(true)
  })

  it("parses signature_request.resent payload", () => {
    const parsed = zSignatureEventDataV1.safeParse({
      type: "signature_request.resent",
      requestId: "req-1",
      organizationId: "org-1",
      data: { partyId: "party-1", recipientEmail: "jane@example.com" },
    })
    expect(parsed.success).toBe(true)
  })
})
