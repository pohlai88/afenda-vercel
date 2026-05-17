// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatCardRenderer } from "#components2/metadata/renderers/stat-card.renderer"

describe("StatCardRenderer", () => {
  it("renders governed error empty state when configuration is invalid", () => {
    render(<StatCardRenderer configuration={{ stats: [] }} />)
    expect(screen.getByText("Card unavailable")).toBeTruthy()
  })

  it("renders stat tiles for valid configuration", () => {
    render(
      <StatCardRenderer
        configuration={{
          stats: [
            {
              label: "Compliance items",
              value: "3",
              delta: "2 overdue",
              tone: "critical",
            },
          ],
        }}
      />
    )
    expect(screen.getByLabelText("Statistics")).toBeTruthy()
    expect(screen.getByText("Compliance items")).toBeTruthy()
    expect(screen.getByText("2 overdue")).toBeTruthy()
  })
})
