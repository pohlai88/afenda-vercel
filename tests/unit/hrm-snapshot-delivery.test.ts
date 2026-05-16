import { describe, expect, it } from "vitest"

import { shouldRunHrmSnapshotDelivery } from "../../lib/features/hrm/data/hrm-snapshot-delivery.shared"
import { isInstallmentDueOnOrBefore } from "../../lib/features/hrm/data/salary-advance-installment.shared"

describe("hrm snapshot delivery schedule", () => {
  it("runs weekly on Monday UTC", () => {
    const monday = new Date("2026-05-18T09:00:00.000Z")
    expect(shouldRunHrmSnapshotDelivery(monday, "weekly")).toBe(true)
    const tuesday = new Date("2026-05-19T09:00:00.000Z")
    expect(shouldRunHrmSnapshotDelivery(tuesday, "weekly")).toBe(false)
  })

  it("runs monthly on the first UTC calendar day", () => {
    const first = new Date("2026-06-01T09:00:00.000Z")
    expect(shouldRunHrmSnapshotDelivery(first, "monthly")).toBe(true)
    const second = new Date("2026-06-02T09:00:00.000Z")
    expect(shouldRunHrmSnapshotDelivery(second, "monthly")).toBe(false)
  })
})

describe("isInstallmentDueOnOrBefore", () => {
  it("compares YYYY-MM-DD lexicographically", () => {
    expect(isInstallmentDueOnOrBefore("2026-03-31", "2026-04-30")).toBe(true)
    expect(isInstallmentDueOnOrBefore("2026-05-01", "2026-04-30")).toBe(false)
  })
})
