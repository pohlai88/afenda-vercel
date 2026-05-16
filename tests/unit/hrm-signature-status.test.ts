import { describe, expect, it } from "vitest"

import {
  allActionablePartiesSigned,
  assertSignaturePartyNotExpired,
  deriveSignatureRequestStatus,
  isPartysTurnToSign,
  signaturePartyIntentComplete,
} from "../../lib/features/hrm/data/signature-request-status.shared"

describe("deriveSignatureRequestStatus", () => {
  it("returns signed when all actionable parties signed", () => {
    expect(
      deriveSignatureRequestStatus("sent", [
        { role: "signer", signingStatus: "signed" },
        { role: "signer", signingStatus: "signed" },
      ])
    ).toBe("signed")
  })

  it("returns partially_signed when some signed", () => {
    expect(
      deriveSignatureRequestStatus("sent", [
        { role: "signer", signingStatus: "signed" },
        { role: "signer", signingStatus: "not_signed" },
      ])
    ).toBe("partially_signed")
  })

  it("returns rejected when any party rejected", () => {
    expect(
      deriveSignatureRequestStatus("sent", [
        {
          role: "signer",
          signingStatus: "rejected",
          rejectionReason: "declined",
        },
        { role: "signer", signingStatus: "not_signed" },
      ])
    ).toBe("rejected")
  })

  it("returns expired when all actionable terminal with expiry", () => {
    expect(
      deriveSignatureRequestStatus("sent", [
        {
          role: "signer",
          signingStatus: "rejected",
          rejectionReason: "expired",
        },
      ])
    ).toBe("expired")
  })

  it("ignores cc role for completion", () => {
    expect(
      deriveSignatureRequestStatus("sent", [
        { role: "signer", signingStatus: "signed" },
        { role: "cc", signingStatus: "not_signed" },
      ])
    ).toBe("signed")
  })
})

describe("isPartysTurnToSign", () => {
  const parties = [
    {
      signerOrder: 1,
      signingStatus: "signed" as const,
      role: "signer" as const,
    },
    {
      signerOrder: 2,
      signingStatus: "not_signed" as const,
      role: "signer" as const,
    },
  ]

  it("allows parallel signing for any pending party", () => {
    expect(isPartysTurnToSign(parties[1]!, parties, "parallel")).toBe(true)
  })

  it("sequential: only lowest pending order may sign", () => {
    const sequential = [
      {
        signerOrder: 1,
        signingStatus: "not_signed" as const,
        role: "signer" as const,
      },
      {
        signerOrder: 2,
        signingStatus: "not_signed" as const,
        role: "signer" as const,
      },
    ]
    expect(isPartysTurnToSign(sequential[0]!, sequential, "sequential")).toBe(
      true
    )
    expect(isPartysTurnToSign(sequential[1]!, sequential, "sequential")).toBe(
      false
    )
  })
})

describe("assertSignaturePartyNotExpired", () => {
  it("throws when not_signed and past expiresAt", () => {
    expect(() =>
      assertSignaturePartyNotExpired({
        signingStatus: "not_signed",
        expiresAt: new Date(Date.now() - 60_000),
      })
    ).toThrow(/expired/)
  })
})

describe("signaturePartyIntentComplete", () => {
  it("requires xor typed vs drawn and declaration", () => {
    expect(
      signaturePartyIntentComplete({
        typedName: "Jane Doe",
        declarationAcknowledged: true,
        consentAt: new Date().toISOString(),
      })
    ).toBe(true)
    expect(
      signaturePartyIntentComplete({
        typedName: "Jane",
        drawnSignatureSha256: "a".repeat(64),
        declarationAcknowledged: true,
        consentAt: new Date().toISOString(),
      })
    ).toBe(false)
  })
})

describe("allActionablePartiesSigned", () => {
  it("is true only when every signer/approver signed", () => {
    expect(
      allActionablePartiesSigned([
        { role: "signer", signingStatus: "signed" },
        { role: "approver", signingStatus: "signed" },
      ])
    ).toBe(true)
    expect(
      allActionablePartiesSigned([
        { role: "signer", signingStatus: "signed" },
        { role: "signer", signingStatus: "not_signed" },
      ])
    ).toBe(false)
  })
})
