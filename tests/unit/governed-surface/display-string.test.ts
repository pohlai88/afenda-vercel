import { describe, expect, it } from "vitest"

import { statCardConfigurationSchema } from "#features/governed-surface/schemas/stat-card.schema"

describe("stat-card display strings", () => {
  it("rejects raw ISO dates in KPI values", () => {
    const result = statCardConfigurationSchema.safeParse({
      dataNature: "kpi",
      stats: [{ label: "As of", value: "2026-05-17", tone: "default" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects raw decimals in snapshot-summary values", () => {
    const result = statCardConfigurationSchema.safeParse({
      dataNature: "snapshot-summary",
      stats: [{ label: "Net", value: "3637.60", tone: "default" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts formatted currency in snapshot-summary", () => {
    const result = statCardConfigurationSchema.safeParse({
      dataNature: "snapshot-summary",
      stats: [{ label: "Net pay", value: "$3,637.60", tone: "positive" }],
    })
    expect(result.success).toBe(true)
  })
})
