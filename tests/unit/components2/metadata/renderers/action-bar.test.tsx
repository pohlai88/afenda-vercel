// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GALLERY_ACTION_BAR } from "#features/dev"
import { ActionBarRenderer } from "#components2/metadata/renderers/action-bar.renderer"

describe("ActionBarRenderer", () => {
  it("renders error empty state when configuration is invalid", () => {
    render(<ActionBarRenderer configuration={{ actions: [] }} />)
    expect(screen.getByText("Actions unavailable")).toBeTruthy()
  })

  it("renders action labels for valid configuration", () => {
    render(<ActionBarRenderer configuration={GALLERY_ACTION_BAR} />)
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy()
  })
})
