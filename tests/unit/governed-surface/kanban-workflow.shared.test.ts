import { describe, expect, it } from "vitest"

import {
  buildKanbanWorkflowFromColumnTransitions,
  isKanbanTransitionAllowed,
  kanbanTransitionId,
} from "#features/governed-surface"

describe("buildKanbanWorkflowFromColumnTransitions", () => {
  it("emits stable edge ids for resolveKanbanCardTransition", () => {
    const workflow = buildKanbanWorkflowFromColumnTransitions({
      todo: ["done"],
    })
    expect(workflow.transitions).toEqual([
      {
        id: kanbanTransitionId("todo", "done"),
        fromColumnId: "todo",
        toColumnId: "done",
      },
    ])
    expect(isKanbanTransitionAllowed(workflow, "todo", "done")).toBe(true)
    expect(isKanbanTransitionAllowed(workflow, "todo", "blocked")).toBe(false)
  })
})
