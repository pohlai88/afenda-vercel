// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GALLERY_EMPTY } from "#features/dev"
import { EmptyRenderer } from "#components2/metadata/renderers/empty.renderer"

describe("EmptyRenderer", () => {
  it("renders nothing when configuration is invalid", () => {
    const { container } = render(<EmptyRenderer configuration={{ title: "" }} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders title for valid configuration", () => {
    render(<EmptyRenderer configuration={GALLERY_EMPTY} />)
    expect(screen.getByText("No records yet")).toBeTruthy()
  })
})
