// @vitest-environment jsdom

import "../../helpers/setup-mock-i18n-navigation"

import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  AFENDA_GOVERNED_COMPONENT_REGISTRY,
  GovernedComponentRenderer,
} from "#components2/metadata"
import { ChartRenderer } from "#components2/metadata/renderers/chart.renderer"
import {
  parseGovernedComponentRegistryData,
  parseGovernedComponentData,
} from "#features/governed-surface"
import { renderWithNextIntl } from "../../helpers/render-with-next-intl"

describe("governed component registry contract", () => {
  it("round-trips AFENDA_GOVERNED_COMPONENT_REGISTRY through zod", () => {
    const parsed = parseGovernedComponentRegistryData(
      AFENDA_GOVERNED_COMPONENT_REGISTRY
    )
    expect(parsed.success).toBe(true)
    expect(parsed.data?.["governed:stat-card"]).toBe("stat-card")
  })

  it("renders a known governed:stat-card configuration", () => {
    const component = {
      type: "governed:stat-card",
      serverType: "governed:stat-card",
      configuration: {
        stats: [
          {
            label: "Total employees",
            value: "248",
            delta: "+3 this week",
            tone: "positive",
          },
        ],
      },
    }
    const parsed = parseGovernedComponentData(component)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    renderWithNextIntl(<GovernedComponentRenderer component={parsed.data} />)
    expect(screen.getByLabelText("Statistics")).toBeTruthy()
    expect(screen.getByText("Total employees")).toBeTruthy()
    expect(screen.getByText("248")).toBeTruthy()
  })

  it("renders a known governed:list-surface configuration", () => {
    const component = {
      type: "governed:list-surface",
      serverType: "governed:list-surface",
      configuration: {
        dataNature: "table",
        surface: {
          header: {
            eyebrow: "HRM",
            title: "Employees",
            description: "Workforce roster",
          },
          columnsId: "preview",
          rowKey: "id",
          empty: { variant: "muted", title: "No rows" },
        },
        columns: [{ id: "name", header: "Name" }],
        rows: [{ id: "1", cells: { name: "Ada Lovelace" } }],
      },
    }
    const parsed = parseGovernedComponentData(component)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    renderWithNextIntl(<GovernedComponentRenderer component={parsed.data} />)
    expect(screen.getByText("Employees")).toBeTruthy()
    expect(screen.getByText("Ada Lovelace")).toBeTruthy()
  })

  it("renders error empty state when chart configuration fails validation", () => {
    renderWithNextIntl(
      <ChartRenderer
        configuration={{
          dataNature: "categorical",
          chartKind: "bar",
          series: [],
        }}
      />
    )
    expect(screen.getByText("Chart unavailable")).toBeTruthy()
  })

  it("rejects envelopes with types outside the governed component enum", () => {
    const parsed = parseGovernedComponentData({
      type: "governed:unknown-widget",
      serverType: "governed:unknown-widget",
      configuration: {},
    })
    expect(parsed.success).toBe(false)
  })
})
