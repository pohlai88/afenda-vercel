import { describe, expect, it } from "vitest"

import { scenarioIdSchema } from "#lib/erp/scenario-types.shared"

describe("scenarioIdSchema", () => {
  it("accepts dotted lowercase identifiers", () => {
    expect(
      scenarioIdSchema.safeParse("vendor.payment.blocked.cert_expiry").success
    ).toBe(true)
  })

  it("rejects uppercase segments", () => {
    expect(scenarioIdSchema.safeParse("Vendor.payment.blocked").success).toBe(
      false
    )
  })

  it("rejects single segment", () => {
    expect(scenarioIdSchema.safeParse("vendor").success).toBe(false)
  })

  it("rejects empty and too short", () => {
    expect(scenarioIdSchema.safeParse("").success).toBe(false)
    expect(scenarioIdSchema.safeParse("a.b").success).toBe(false)
  })
})
