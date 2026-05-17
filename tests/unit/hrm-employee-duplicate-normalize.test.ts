import { describe, expect, it } from "vitest"

import {
  normalizeEmployeeDuplicateEmail,
  normalizeEmployeeDuplicatePhone,
} from "#features/hrm/employee-management/employee-records-management/data/employee-duplicate-check.shared"

describe("employee duplicate normalization", () => {
  it("lowercases and trims email", () => {
    expect(normalizeEmployeeDuplicateEmail("  Alex@Example.COM  ")).toBe(
      "alex@example.com"
    )
  })

  it("collapses phone whitespace", () => {
    expect(normalizeEmployeeDuplicatePhone(" +60 (12) 345-6789 ")).toBe(
      "+60123456789"
    )
  })
})
