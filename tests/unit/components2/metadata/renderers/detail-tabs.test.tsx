// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GALLERY_DETAIL_TABS } from "#components2/dev/metadata-renderer-gallery/gallery-fixtures"
import { DetailTabsRenderer } from "#components2/metadata/renderers/detail-tabs.renderer"

describe("DetailTabsRenderer", () => {
  it("renders error empty state when configuration is invalid", () => {
    render(<DetailTabsRenderer configuration={{ entityId: "" }} />)
    expect(screen.getByText("Section unavailable")).toBeTruthy()
  })

  it("renders overview tab and nested stat-card content", () => {
    render(<DetailTabsRenderer configuration={GALLERY_DETAIL_TABS} />)
    expect(screen.getByRole("tab", { name: "Overview" })).toBeTruthy()
    expect(screen.getByText("Gross pay")).toBeTruthy()
  })
})
