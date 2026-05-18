import { describe, expect, it } from "vitest"

import {
  evaluateFormRuleCondition,
  resolveFormFieldRuleState,
} from "#features/governed-surface/form-rules.evaluate.shared"
import type { FormRule } from "#features/governed-surface/schemas/form-rules.schema"

describe("resolveFormFieldRuleState", () => {
  it("hides a field when SHOW rule condition does not match", () => {
    const rules: FormRule[] = [
      {
        effect: "SHOW",
        condition: { scope: "field", fieldId: "laptop", equals: "mac" },
      },
    ]
    const hidden = resolveFormFieldRuleState(rules, { laptop: "win" })
    expect(hidden.visible).toBe(false)
  })

  it("disables a field when DISABLE matches", () => {
    const rules: FormRule[] = [
      {
        effect: "DISABLE",
        condition: { scope: "field", fieldId: "confirmed", equals: false },
      },
    ]
    const state = resolveFormFieldRuleState(rules, { confirmed: false })
    expect(state.enabled).toBe(false)
  })
})

describe("evaluateFormRuleCondition", () => {
  it("evaluates AND composite conditions", () => {
    const match = evaluateFormRuleCondition(
      {
        scope: "and",
        conditions: [
          { scope: "field", fieldId: "a", equals: 1 },
          { scope: "field", fieldId: "b", equals: "ok" },
        ],
      },
      { a: 1, b: "ok" }
    )
    expect(match).toBe(true)
  })
})
