// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { KanbanBoardView } from "#components2/metadata/renderers/kanban-board-view"
import type { GovernedKanbanBoardConfiguration } from "#features/governed-surface"

const READ_ONLY_BOARD = {
  dataNature: "kanban",
  interactionMode: "read-only",
  copy: {
    boardAriaLabel: "Hiring pipeline",
    emptyColumn: "No items",
  },
  workflow: {
    transitions: [
      { id: "todo->done", fromColumnId: "todo", toColumnId: "done" },
    ],
  },
  columns: [
    { id: "todo", label: "To do" },
    { id: "done", label: "Done" },
  ],
  cards: [
    {
      id: "c1",
      columnId: "todo",
      title: "Review offer",
      availableTransitions: [
        { transitionId: "todo->done", state: "ready", label: "Complete" },
      ],
    },
  ],
} as const satisfies GovernedKanbanBoardConfiguration

describe("KanbanBoardView", () => {
  afterEach(() => {
    cleanup()
  })

  it("uses server copy for aria labels and light empty columns", () => {
    render(
      <KanbanBoardView
        board={{
          ...READ_ONLY_BOARD,
          cards: [],
        }}
      />
    )

    expect(screen.getByRole("region", { name: "Hiring pipeline" })).toBeTruthy()
    expect(screen.getAllByText("No items").length).toBeGreaterThan(0)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("renders transition hints as badges, not buttons", () => {
    render(<KanbanBoardView board={READ_ONLY_BOARD} />)

    expect(screen.getByText("Complete")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("does not enable drag interaction in read-only mode", () => {
    render(<KanbanBoardView board={READ_ONLY_BOARD} />)

    const board = screen.getByTestId("governed-kanban-board")
    expect(board.getAttribute("data-interaction-mode")).toBe("read-only")
    expect(board.querySelector('[data-kanban-card-draggable="true"]')).toBeNull()
  })

  it("uses surfaceKey for board and card test ids", () => {
    render(
      <KanbanBoardView board={READ_ONLY_BOARD} surfaceKey="hrm:claims:kanban" />
    )

    expect(
      screen.getByTestId("governed-kanban-board:hrm:claims:kanban")
    ).toBeTruthy()
    expect(
      screen.getByTestId("governed-kanban-card:hrm:claims:kanban:c1")
    ).toBeTruthy()
  })

  it("renders footer-actions via renderCardFooter, not transition hints", () => {
    render(
      <KanbanBoardView
        board={{
          dataNature: "kanban",
          interactionMode: "footer-actions",
          copy: {
            boardAriaLabel: "Pipeline",
            emptyColumn: "Empty",
          },
          columns: [{ id: "todo", label: "To do" }],
          cards: [{ id: "c1", columnId: "todo", title: "Alex Kim" }],
        }}
        renderCardFooter={() => (
          <button type="button" disabled>
            Advance
          </button>
        )}
      />
    )

    expect(screen.getByRole("button", { name: "Advance" })).toBeTruthy()
    expect(screen.queryByText("Complete")).toBeNull()
  })
})
