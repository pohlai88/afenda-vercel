// @vitest-environment jsdom

import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ListSurfaceCell } from "#components2/metadata/renderers/list-surface-cell.client"
import { renderWithNextIntl } from "../../../helpers/render-with-next-intl"

describe("ListSurfaceCell", () => {
  it("renders badge tone from cellKind", () => {
    renderWithNextIntl(
      <ListSurfaceCell
        column={{
          id: "status",
          header: "Status",
          cellKind: { kind: "badge", tone: "positive" },
        }}
        row={{
          id: "1",
          cells: { status: "Active" },
        }}
      />
    )
    expect(screen.getByText("Active")).toBeTruthy()
  })

  it("formats currency values", () => {
    renderWithNextIntl(
      <ListSurfaceCell
        column={{
          id: "amount",
          header: "Amount",
          cellKind: { kind: "currency", currency: "USD" },
        }}
        row={{
          id: "1",
          cells: { amount: 1234.5 },
        }}
      />
    )
    expect(screen.getByText(/\$1,234\.50/)).toBeTruthy()
  })
})
