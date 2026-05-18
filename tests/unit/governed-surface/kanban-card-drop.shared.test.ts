import { describe, expect, it } from "vitest"

import {
  buildKanbanCardMovePayload,
  isKanbanCardDraggable,
  resolveKanbanCardDropState,
} from "#features/governed-surface"
import type { KanbanCard } from "#features/governed-surface"

const WORKFLOW = {
  transitions: [
    { id: "a->b", fromColumnId: "a", toColumnId: "b" },
    { id: "b->c", fromColumnId: "b", toColumnId: "c" },
  ],
} as const

const CARD_IN_A = {
  id: "1",
  columnId: "a",
  title: "Card",
  availableTransitions: [
    { transitionId: "a->b", state: "ready", label: "Move to B" },
    {
      transitionId: "b->c",
      state: "disabled",
      label: "Skip",
      disabledReason: "Not from B",
    },
  ],
} as const satisfies KanbanCard

describe("kanban card drop helpers", () => {
  it("allows drop when transition is ready", () => {
    expect(resolveKanbanCardDropState(CARD_IN_A, WORKFLOW, "b")).toBe("allowed")
  })

  it("forbids drop on same column or unknown edge", () => {
    expect(resolveKanbanCardDropState(CARD_IN_A, WORKFLOW, "a")).toBe(
      "forbidden"
    )
    expect(resolveKanbanCardDropState(CARD_IN_A, WORKFLOW, "c")).toBe(
      "forbidden"
    )
  })

  it("marks draggable when a ready outgoing transition exists", () => {
    expect(isKanbanCardDraggable(CARD_IN_A, WORKFLOW)).toBe(true)
  })

  it("builds move payload with canonical transition id", () => {
    expect(buildKanbanCardMovePayload(CARD_IN_A, "b")).toEqual({
      cardId: "1",
      fromColumnId: "a",
      toColumnId: "b",
      transitionId: "a->b",
    })
  })
})
