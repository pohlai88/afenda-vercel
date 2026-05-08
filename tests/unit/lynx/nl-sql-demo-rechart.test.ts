import { describe, expect, it } from "vitest"

import { transformLynxNlDemoDataForMultiLineChart } from "#features/lynx/data/nl-sql-demo-rechart.shared"
import type { LynxNlDemoChartConfig } from "#features/lynx/schemas/nl-sql-demo.schema"

describe("transformLynxNlDemoDataForMultiLineChart", () => {
  it("returns empty when input empty", () => {
    const cfg: LynxNlDemoChartConfig = {
      description: "",
      takeaway: "",
      type: "line",
      title: "",
      xKey: "year",
      yKeys: ["value"],
      multipleLines: true,
      measurementColumn: "value",
      lineCategories: ["a", "b"],
      colors: {},
      legend: true,
    }
    const out = transformLynxNlDemoDataForMultiLineChart([], cfg)
    expect(out.data).toEqual([])
  })

  it("pivots multi-line categories", () => {
    const cfg: LynxNlDemoChartConfig = {
      description: "",
      takeaway: "",
      type: "line",
      title: "",
      xKey: "year",
      yKeys: ["value"],
      multipleLines: true,
      measurementColumn: "value",
      lineCategories: ["east", "west"],
      colors: {},
      legend: true,
    }
    const rows = [
      { year: 2020, region: "east", value: 10 },
      { year: 2020, region: "west", value: 20 },
      { year: 2021, region: "east", value: 11 },
    ]
    const out = transformLynxNlDemoDataForMultiLineChart(rows, cfg)
    expect(out.lineFields).toEqual(["east", "west"])
    expect(out.data.length).toBeGreaterThan(0)
  })
})
