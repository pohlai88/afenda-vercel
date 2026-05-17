import { describe, expect, it } from "vitest"

import { createLeaveTypeFormSchema } from "../../lib/features/hrm/workforce-time-attendance/schemas/leave-policy.schema"

describe("HRM policies — leave type schema", () => {
  it("accepts annual_grant leave type with tiers", () => {
    const parsed = createLeaveTypeFormSchema.safeParse({
      code: "ANNUAL",
      accrualMethod: "annual_grant",
      paid: true,
      genderRestriction: null,
      tier1Days: 8,
      tier1MaxYears: 2,
      tier2Days: 12,
      tier2MaxYears: 5,
      tier3Days: 16,
      fixedDaysPerYear: null,
      maxCarryForward: 5,
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects invalid leave type codes", () => {
    const parsed = createLeaveTypeFormSchema.safeParse({
      code: "bad code",
      accrualMethod: "annual_grant",
      paid: true,
      genderRestriction: null,
      tier1Days: 8,
      tier1MaxYears: 2,
      tier2Days: 12,
      tier2MaxYears: 5,
      tier3Days: 16,
      fixedDaysPerYear: null,
      maxCarryForward: 5,
    })
    expect(parsed.success).toBe(false)
  })
})
