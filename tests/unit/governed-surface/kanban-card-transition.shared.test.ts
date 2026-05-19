import { describe, expect, it } from "vitest"

import {
  isKanbanCardTransitionRenderable,
  kanbanCardTransitionHidden,
  kanbanTransitionId,
  resolveKanbanCardTransition,
} from "#features/governed-surface"

describe("resolveKanbanCardTransition", () => {
  it("uses canonical transition ids aligned with workflow edges", () => {
    const hint = resolveKanbanCardTransition({
      fromColumnId: "applied",
      toColumnId: "screening",
      label: "Move to screening",
      allowed: true,
    })
    expect(hint.transitionId).toBe(kanbanTransitionId("applied", "screening"))
    expect(hint.state).toBe("ready")
  })

  it("returns hidden when visibility is false", () => {
    const hint = resolveKanbanCardTransition({
      fromColumnId: "a",
      toColumnId: "b",
      label: "Hidden move",
      visible: false,
      allowed: true,
    })
    expect(hint.state).toBe("hidden")
    expect(isKanbanCardTransitionRenderable(hint)).toBe(false)
  })

  it("returns disabled with default reason when not allowed", () => {
    const hint = resolveKanbanCardTransition({
      fromColumnId: "a",
      toColumnId: "b",
      label: "Blocked",
      allowed: false,
    })
    expect(hint.state).toBe("disabled")
    expect(hint.disabledReason).toBe("Not permitted")
    expect(isKanbanCardTransitionRenderable(hint)).toBe(true)
  })

  it("kanbanCardTransitionHidden matches hidden resolver output", () => {
    expect(kanbanCardTransitionHidden("x", "y", "Move")).toEqual(
      resolveKanbanCardTransition({
        fromColumnId: "x",
        toColumnId: "y",
        label: "Move",
        visible: false,
        allowed: true,
      })
    )
  })
})
