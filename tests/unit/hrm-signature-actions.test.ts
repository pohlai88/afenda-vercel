import { describe, expect, it, vi } from "vitest"

import { deriveSignatureRequestStatus } from "#features/tools/electronic-signatures/data/signature-request-status.shared"

vi.mock("server-only", () => ({}))

describe("signature request status projection", () => {
  it("returns signed when all actionable parties signed", () => {
    const status = deriveSignatureRequestStatus("sent", [
      { role: "signer", signingStatus: "signed" },
      { role: "signer", signingStatus: "signed" },
    ])
    expect(status).toBe("signed")
  })

  it("returns rejected when any party rejected", () => {
    const status = deriveSignatureRequestStatus("partially_signed", [
      { role: "signer", signingStatus: "signed" },
      { role: "signer", signingStatus: "rejected" },
    ])
    expect(status).toBe("rejected")
  })
})
