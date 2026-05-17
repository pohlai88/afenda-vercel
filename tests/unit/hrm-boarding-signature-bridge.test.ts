import { describe, expect, it } from "vitest"

import { boardingTaskRequiresSignature } from "../../lib/features/hrm/employee-management/employee-lifecycle-management/data/boarding-signature-bridge.shared.ts"

describe("boardingTaskRequiresSignature", () => {
  it("returns false for empty metadata", () => {
    expect(boardingTaskRequiresSignature(null)).toBe(false)
    expect(boardingTaskRequiresSignature(undefined)).toBe(false)
    expect(boardingTaskRequiresSignature([])).toBe(false)
  })

  it("returns true when requiresSignature flag is set", () => {
    expect(boardingTaskRequiresSignature({ requiresSignature: true })).toBe(
      true
    )
    expect(boardingTaskRequiresSignature({ requiresSignature: false })).toBe(
      false
    )
  })
})
