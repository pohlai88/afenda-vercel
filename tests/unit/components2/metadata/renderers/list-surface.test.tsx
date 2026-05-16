// @vitest-environment jsdom

import "../../../../helpers/setup-mock-i18n-navigation"

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ListSurfaceRenderer } from "#components2/metadata/renderers/list-surface.renderer"

describe("ListSurfaceRenderer", () => {
  it("renders nothing when configuration is invalid", () => {
    const { container } = render(
      <ListSurfaceRenderer
        configuration={{ surface: {}, columns: [], rows: [] }}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders governed list chrome and rows for valid configuration", () => {
    render(
      <ListSurfaceRenderer
        configuration={{
          surface: {
            header: {
              title: "Employees",
              description: "Directory",
            },
            columnsId: "hrm-employees",
            rowKey: "id",
            empty: {
              variant: "muted",
              title: "No employees",
            },
          },
          columns: [
            { id: "name", header: "Name" },
            { id: "status", header: "Status" },
          ],
          rows: [
            {
              id: "emp-1",
              cells: { name: "Alice Nguyen", status: "Active" },
            },
          ],
        }}
      />
    )
    expect(screen.getByText("Employees")).toBeTruthy()
    expect(screen.getByText("Alice Nguyen")).toBeTruthy()
    expect(screen.getByText("Active")).toBeTruthy()
  })
})
