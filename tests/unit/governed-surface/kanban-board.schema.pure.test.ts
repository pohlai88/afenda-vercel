import { describe, expect, it } from "vitest"

import { parseGovernedKanbanBoardConfiguration } from "#features/governed-surface"

const BASE_COPY = {
  boardAriaLabel: "Pipeline",
  emptyColumn: "Empty",
} as const

describe("governedKanbanBoardConfigurationSchema", () => {
  it("rejects card actions (no fake kernel buttons)", () => {
    const parsed = parseGovernedKanbanBoardConfiguration({
      dataNature: "kanban",
      copy: BASE_COPY,
      columns: [{ id: "a", label: "A" }],
      cards: [
        {
          id: "1",
          columnId: "a",
          title: "Card",
          actions: [{ id: "x", label: "Do it", intent: "default" }],
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })

  it("requires workflow when cards declare availableTransitions", () => {
    const parsed = parseGovernedKanbanBoardConfiguration({
      dataNature: "kanban",
      copy: BASE_COPY,
      columns: [{ id: "a", label: "A" }],
      cards: [
        {
          id: "1",
          columnId: "a",
          title: "Card",
          availableTransitions: [
            { transitionId: "a->b", state: "ready", label: "Move" },
          ],
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects availableTransitions on footer-actions boards", () => {
    const parsed = parseGovernedKanbanBoardConfiguration({
      dataNature: "kanban",
      interactionMode: "footer-actions",
      copy: BASE_COPY,
      workflow: {
        transitions: [{ id: "a->b", fromColumnId: "a", toColumnId: "b" }],
      },
      columns: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      cards: [
        {
          id: "1",
          columnId: "a",
          title: "Card",
          availableTransitions: [
            { transitionId: "a->b", state: "ready", label: "Move" },
          ],
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })

  it("requires workflow, dragHandleAriaLabel, and per-card transitions for drag-reorder", () => {
    const missingWorkflow = parseGovernedKanbanBoardConfiguration({
      dataNature: "kanban",
      interactionMode: "drag-reorder",
      copy: {
        ...BASE_COPY,
        dragHandleAriaLabel: "Move card",
      },
      columns: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      cards: [
        {
          id: "1",
          columnId: "a",
          title: "Card",
          availableTransitions: [
            { transitionId: "a->b", state: "ready", label: "Move" },
          ],
        },
      ],
    })
    expect(missingWorkflow.success).toBe(false)

    const valid = parseGovernedKanbanBoardConfiguration({
      dataNature: "kanban",
      interactionMode: "drag-reorder",
      copy: {
        ...BASE_COPY,
        dragHandleAriaLabel: "Move card",
      },
      workflow: {
        transitions: [{ id: "a->b", fromColumnId: "a", toColumnId: "b" }],
      },
      columns: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      cards: [
        {
          id: "1",
          columnId: "a",
          title: "Card",
          availableTransitions: [
            { transitionId: "a->b", state: "ready", label: "Move" },
          ],
        },
      ],
    })
    expect(valid.success).toBe(true)
  })

  it("accepts a read-only board with workflow-aligned transition hints", () => {
    const parsed = parseGovernedKanbanBoardConfiguration({
      dataNature: "kanban",
      interactionMode: "read-only",
      copy: BASE_COPY,
      workflow: {
        transitions: [{ id: "a->b", fromColumnId: "a", toColumnId: "b" }],
      },
      columns: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      cards: [
        {
          id: "1",
          columnId: "a",
          title: "Card",
          availableTransitions: [
            { transitionId: "a->b", state: "ready", label: "Move" },
          ],
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })
})
