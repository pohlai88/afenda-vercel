import { describe, expect, it } from "vitest"

import {
  governedKanbanBoardTestId,
  governedKanbanCardTestId,
  governedKanbanSectionTestId,
  resolveKanbanBoardDomProps,
} from "#features/governed-surface"

describe("kanban surface identity", () => {
  it("builds stable section and board test ids from surfaceKey", () => {
    expect(governedKanbanSectionTestId("hrm:recruitment:pipeline")).toBe(
      "governed-kanban-section:hrm:recruitment:pipeline"
    )
    expect(governedKanbanBoardTestId("hrm:recruitment:pipeline")).toBe(
      "governed-kanban-board:hrm:recruitment:pipeline"
    )
    expect(governedKanbanCardTestId("hrm:recruitment:pipeline", "app-1")).toBe(
      "governed-kanban-card:hrm:recruitment:pipeline:app-1"
    )
  })

  it("falls back to generic board test id without surfaceKey", () => {
    expect(resolveKanbanBoardDomProps()).toEqual({
      "data-testid": "governed-kanban-board",
    })
  })

  it("adds governed-surface-key when surfaceKey is set", () => {
    expect(resolveKanbanBoardDomProps("hrm:claims:kanban")).toEqual({
      "data-testid": "governed-kanban-board:hrm:claims:kanban",
      "data-governed-surface-key": "hrm:claims:kanban",
    })
  })
})
