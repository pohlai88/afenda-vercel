// @vitest-environment jsdom

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GovernedKanbanDragBoard } from "#features/governed-surface/client"

import { renderWithNextIntl } from "../../helpers/render-with-next-intl"

describe("GovernedKanbanDragBoard", () => {
  afterEach(() => {
    cleanup()
  })

  it("rejects footer-actions configuration", () => {
    renderWithNextIntl(
      <GovernedKanbanDragBoard
        configuration={{
          dataNature: "kanban",
          interactionMode: "footer-actions",
          copy: {
            boardAriaLabel: "Pipeline",
            emptyColumn: "Empty",
          },
          columns: [{ id: "a", label: "A" }],
          cards: [],
        }}
        onCardMove={vi.fn()}
      />
    )
    expect(
      screen.getByText("This board is not configured for drag reorder.")
    ).toBeTruthy()
  })
})
