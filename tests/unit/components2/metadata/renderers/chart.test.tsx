// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChartRenderer } from "#components2/metadata/renderers/chart.renderer"

describe("ChartRenderer", () => {
  it("renders governed error empty state when configuration is invalid", () => {
    render(<ChartRenderer configuration={{ series: [] }} />)
    expect(screen.getByText("Chart unavailable")).toBeTruthy()
  })

  it("renders chart title and series for valid configuration", () => {
    render(
      <ChartRenderer
        configuration={{
          dataNature: "time-series",
          chartKind: "bar",
          title: "Headcount trend",
          series: [
            {
              id: "headcount",
              label: "Headcount",
              points: [
                { x: "Jan", y: 10 },
                { x: "Feb", y: 12 },
              ],
            },
          ],
        }}
      />
    )
    expect(screen.getByText("Headcount trend")).toBeTruthy()
    expect(screen.getByLabelText("Headcount trend")).toBeTruthy()
  })
})
