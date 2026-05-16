// @vitest-environment jsdom

import "../../../helpers/setup-mock-i18n-navigation"

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GovernedComponentRenderer } from "#components2/metadata"
import { parseGovernedComponentData } from "#features/governed-surface"

describe("GovernedComponentRenderer", () => {
  it("returns validation error empty state for invalid component payload", () => {
    render(
      <GovernedComponentRenderer
        component={{
          type: "",
          serverType: "x",
          configuration: {},
        }}
      />
    )
    expect(screen.getByText("Invalid component metadata")).toBeTruthy()
  })
})

describe("GovernedComponentRenderer — stat-card template", () => {
  it("parses configuration before render", () => {
    const parsed = parseGovernedComponentData({
      type: "governed:stat-card",
      serverType: "governed:stat-card",
      configuration: {
        stats: [
          {
            label: "Open positions",
            value: "12",
            delta: "4 urgent",
            tone: "attention",
          },
        ],
      },
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    render(<GovernedComponentRenderer component={parsed.data} />)
    expect(screen.getByText("Open positions")).toBeTruthy()
  })
})
