import { describe, expect, it, vi } from "vitest"

import { allActionablePartiesSigned } from "../../lib/features/hrm/data/signature-request-status.shared"

vi.mock("workflow", () => ({
  FatalError: class FatalError extends Error {},
}))

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}))

vi.mock("#lib/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}))

describe("hrm signature seal workflow helpers", () => {
  it("requires all actionable signers before seal", () => {
    expect(
      allActionablePartiesSigned([
        { role: "signer", signingStatus: "signed" },
        { role: "signer", signingStatus: "signed" },
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
