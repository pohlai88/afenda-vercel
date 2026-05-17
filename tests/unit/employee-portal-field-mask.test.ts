import { describe, expect, it } from "vitest"

import {
  maskBankAccountNumber,
  maskTaxId,
} from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-field-mask.shared"

describe("employee portal field mask", () => {
  it("masks bank account numbers leaving last four digits", () => {
    expect(maskBankAccountNumber("1234567890")).toBe("••••••7890")
    expect(maskBankAccountNumber(" 1234 ")).toBe("••••")
  })

  it("masks tax identifiers leaving last two characters", () => {
    expect(maskTaxId("S1234567A")).toBe("•••••••7A")
    expect(maskTaxId("AB")).toBe("••")
  })

  it("returns empty string for blank values", () => {
    expect(maskBankAccountNumber(null)).toBe("")
    expect(maskTaxId(undefined)).toBe("")
  })
})
