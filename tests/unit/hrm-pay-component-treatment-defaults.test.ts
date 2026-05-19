import { describe, expect, it } from "vitest"

import { listDefaultPayComponentTreatments } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/pay-component-treatment.defaults.shared"

describe("listDefaultPayComponentTreatments", () => {
  it("includes BASIC as taxable and contributable for MY", () => {
    const treatments = listDefaultPayComponentTreatments("MY")
    const basic = treatments.find((t) => t.componentCode === "BASIC")
    expect(basic).toMatchObject({
      taxable: true,
      contributable: true,
      pensionable: true,
    })
  })

  it("includes country-specific deduction codes for SG", () => {
    const treatments = listDefaultPayComponentTreatments("SG")
    expect(treatments.some((t) => t.componentCode === "CPF_EE")).toBe(true)
  })
})
