// @vitest-environment jsdom

import "../../../../helpers/setup-mock-i18n-navigation"

import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ListSurfaceRenderer } from "#components2/metadata/renderers/list-surface.renderer"
import { renderWithNextIntl } from "../../../../helpers/render-with-next-intl"

describe("ListSurfaceRenderer", () => {
  it("renders table-only without list chrome header", () => {
    renderWithNextIntl(
      <ListSurfaceRenderer
        variant="table-only"
        configuration={{
          dataNature: "table",
          surface: {
            header: {
              title: "Hidden chrome title",
              description: "Should not appear in table-only mode",
            },
            columnsId: "test",
            rowKey: "id",
            empty: { variant: "muted", title: "Empty" },
          },
          columns: [{ id: "name", header: "Name" }],
          rows: [{ id: "1", cells: { name: "Ada" } }],
        }}
      />
    )
    expect(screen.getByText("Ada")).toBeTruthy()
    expect(screen.queryByText("Hidden chrome title")).toBeNull()
  })
})
