import { describe, expect, it } from "vitest"

import { GALLERY_SCENARIOS } from "#features/dev"
import { parseGovernedComponentData } from "#features/governed-surface/schemas/component.schema"

describe("metadata renderer gallery scenarios", () => {
  it("every scenario parses as a governed component envelope", () => {
    for (const scenario of GALLERY_SCENARIOS) {
      const parsed = parseGovernedComponentData(scenario.component)
      expect(parsed.success, scenario.id).toBe(true)
    }
  })

  it("covers all shipped renderer types at least once", () => {
    const shipped = new Set(
      GALLERY_SCENARIOS.map((s) => s.component.type)
    )
    const expected = [
      "governed:stat-card",
      "governed:list-surface",
      "governed:section",
      "governed:stack",
      "governed:action-bar",
      "governed:empty",
      "governed:audit-panel",
      "governed:detail-tabs",
      "governed:chart",
      "governed:approval-timeline",
      "governed:kanban-board",
      "governed:multi-step-form",
      "governed:scorecard-form",
    ] as const
    for (const type of expected) {
      expect(shipped.has(type), `missing gallery scenario for ${type}`).toBe(
        true
      )
    }
  })
})
