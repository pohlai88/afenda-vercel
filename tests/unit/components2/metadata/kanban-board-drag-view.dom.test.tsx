// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { KanbanBoardDragView } from "#components2/metadata/renderers/kanban-board-drag-view.client"
import type { GovernedKanbanBoardConfiguration } from "#features/governed-surface"

const DRAG_BOARD = {
  dataNature: "kanban",
  interactionMode: "drag-reorder",
  copy: {
    boardAriaLabel: "Pipeline",
    emptyColumn: "Empty",
    dragHandleAriaLabel: "Move card",
  },
  workflow: {
    transitions: [{ id: "a->b", fromColumnId: "a", toColumnId: "b" }],
  },
  columns: [
    { id: "a", label: "Column A" },
    { id: "b", label: "Column B" },
  ],
  cards: [
    {
      id: "c1",
      columnId: "a",
      title: "Movable card",
      availableTransitions: [
        { transitionId: "a->b", state: "ready", label: "Move to B" },
      ],
    },
  ],
} as const satisfies GovernedKanbanBoardConfiguration

describe("KanbanBoardDragView", () => {
  afterEach(() => {
    cleanup()
  })

  it("enables drag on cards with ready transitions", () => {
    render(<KanbanBoardDragView board={DRAG_BOARD} onCardMove={vi.fn()} />)

    const board = screen.getByTestId("governed-kanban-board")
    expect(board.getAttribute("data-interaction-mode")).toBe("drag-reorder")
    expect(
      board.querySelector('[data-kanban-card-draggable="true"]')
    ).toBeTruthy()
  })

  it("calls onCardMove with payload when dropped on allowed column", () => {
    const onCardMove = vi.fn()
    render(<KanbanBoardDragView board={DRAG_BOARD} onCardMove={onCardMove} />)

    const draggable = document.querySelector(
      '[data-kanban-card-draggable="true"]'
    ) as HTMLElement
    const targetColumn = screen.getByRole("region", { name: "Column B, 0" })

    const dataTransfer = {
      effectAllowed: "move",
      dropEffect: "none",
      setData: vi.fn(),
    }

    fireEvent.dragStart(draggable, { dataTransfer })
    fireEvent.dragOver(targetColumn, { dataTransfer })
    fireEvent.drop(targetColumn, { dataTransfer })

    expect(onCardMove).toHaveBeenCalledWith({
      cardId: "c1",
      fromColumnId: "a",
      toColumnId: "b",
      transitionId: "a->b",
    })
  })
})
