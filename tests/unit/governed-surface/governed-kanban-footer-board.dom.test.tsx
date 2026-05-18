// @vitest-environment jsdom

import type { ComponentProps } from "react"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { GovernedKanbanFooterBoard } from "#features/governed-surface/client"

import { renderWithNextIntl } from "../../helpers/render-with-next-intl"

function renderFooterBoard(props: ComponentProps<typeof GovernedKanbanFooterBoard>) {
  return renderWithNextIntl(<GovernedKanbanFooterBoard {...props} />)
}

describe("GovernedKanbanFooterBoard", () => {
  afterEach(() => {
    cleanup()
  })

  it("rejects read-only configuration for footer bridge", () => {
    renderFooterBoard({
      configuration: {
        dataNature: "kanban",
        interactionMode: "read-only",
        copy: {
          boardAriaLabel: "Pipeline",
          emptyColumn: "Empty",
        },
        columns: [{ id: "a", label: "A" }],
        cards: [],
      },
    })

    expect(screen.getByText("This board is unavailable")).toBeTruthy()
    expect(
      screen.getByText("This board is not configured for footer actions.")
    ).toBeTruthy()
  })

  it("renders kanban view for footer-actions configuration", () => {
    renderFooterBoard({
      configuration: {
        dataNature: "kanban",
        interactionMode: "footer-actions",
        copy: {
          boardAriaLabel: "Pipeline",
          emptyColumn: "Empty",
        },
        columns: [{ id: "a", label: "A" }],
        cards: [
          { id: "1", columnId: "a", title: "Alex Kim" },
        ],
      },
    })

    expect(screen.getByRole("region", { name: "Pipeline" })).toBeTruthy()
    expect(screen.getByText("Alex Kim")).toBeTruthy()
  })
})
