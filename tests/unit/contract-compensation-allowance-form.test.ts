import { describe, expect, it } from "vitest"

import { parseAllowanceLineInputsFromForm } from "../../lib/features/hrm/payroll-compensation/compensation-planning-modeling/schema/contract-compensation.shared"

describe("parseAllowanceLineInputsFromForm", () => {
  it("returns lines for valid decimals", () => {
    const fd = new FormData()
    fd.set("allowance.MEAL_ALLOWANCE", "100.50")
    const codeToId = new Map([["MEAL_ALLOWANCE", "comp-1"]])
    const r = parseAllowanceLineInputsFromForm({
      formData: fd,
      codeToId,
      currency: "MYR",
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.lines).toEqual([
      { componentId: "comp-1", amount: "100.50", currency: "MYR" },
    ])
  })

  it("rejects non-empty invalid decimal", () => {
    const fd = new FormData()
    fd.set("allowance.MEAL_ALLOWANCE", "12.345")
    const codeToId = new Map([["MEAL_ALLOWANCE", "comp-1"]])
    const r = parseAllowanceLineInputsFromForm({
      formData: fd,
      codeToId,
      currency: "MYR",
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.invalidCode).toBe("MEAL_ALLOWANCE")
  })

  it("ignores empty fields", () => {
    const fd = new FormData()
    fd.set("allowance.MEAL_ALLOWANCE", "  ")
    const codeToId = new Map([["MEAL_ALLOWANCE", "comp-1"]])
    const r = parseAllowanceLineInputsFromForm({
      formData: fd,
      codeToId,
      currency: "MYR",
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.lines).toHaveLength(0)
  })
})
