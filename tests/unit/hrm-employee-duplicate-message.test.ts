import { describe, expect, it } from "vitest"

import { duplicateMatchErrorMessage } from "#features/hrm/employee-management/employee-records-management/data/employee-duplicate-check.server"

describe("duplicateMatchErrorMessage", () => {
  it("names the matched channel without leaking raw values", () => {
    const message = duplicateMatchErrorMessage([
      {
        employeeId: "emp-1",
        employeeNumber: "E-100",
        legalName: "Alex Example",
        employmentStatus: "active",
        matchedOn: "email",
        matchedField: "workEmail",
      },
    ])

    expect(message).toContain("email")
    expect(message).not.toContain("@")
    expect(message).not.toContain("Alex")
  })
})
