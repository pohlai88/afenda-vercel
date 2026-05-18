import { describe, expect, it } from "vitest"

import { governedKanbanSectionTestId } from "#features/governed-surface/kanban-surface-identity.shared"

describe("governed kanban section identity", () => {
  it("builds stable section test ids", () => {
    expect(governedKanbanSectionTestId("hrm:claims:kanban")).toBe(
      "governed-kanban-section:hrm:claims:kanban"
    )
  })
})
