import { describe, expect, it } from "vitest"

import {
  ORG_CHART_ROOT_ID,
  layoutOrgChartNodes,
  type OrgChartNode,
} from "../../lib/features/hrm/data/org-chart.shared"

const FIXTURE_NODES = [
  {
    id: "dept:root",
    kind: "department" as const,
    parentId: ORG_CHART_ROOT_ID,
    label: "Engineering",
    secondaryLabel: "ENG",
    resourceId: "dept-root-id",
  },
  {
    id: "dept:child",
    kind: "department" as const,
    parentId: "dept:root",
    label: "Platform",
    secondaryLabel: "PLT",
    resourceId: "dept-child-id",
  },
  {
    id: "pos:one",
    kind: "position" as const,
    parentId: "dept:child",
    label: "Staff Engineer",
    secondaryLabel: "SE-01",
    resourceId: "pos-one-id",
    headcount: { budgeted: 2, occupied: 1, open: 1 },
  },
] as const satisfies readonly OrgChartNode[]

describe("org chart dagre layout", () => {
  it("returns deterministic positions for a small tree", () => {
    const first = layoutOrgChartNodes(FIXTURE_NODES, "TB")
    const second = layoutOrgChartNodes(FIXTURE_NODES, "TB")

    expect(first.nodes).toHaveLength(3)
    expect(first.edges).toHaveLength(3)
    expect(first.nodes.map((n) => n.position)).toEqual(
      second.nodes.map((n) => n.position)
    )
    expect(
      first.nodes.find((n) => n.id === "dept:child")?.position.y
    ).toBeGreaterThan(
      first.nodes.find((n) => n.id === "dept:root")?.position.y ?? 0
    )
  })

  it("mirrors layout when switching to horizontal direction", () => {
    const vertical = layoutOrgChartNodes(FIXTURE_NODES, "TB")
    const horizontal = layoutOrgChartNodes(FIXTURE_NODES, "LR")

    expect(horizontal.nodes).toHaveLength(vertical.nodes.length)
    expect(horizontal.edges).toHaveLength(vertical.edges.length)
    expect(
      horizontal.nodes.find((n) => n.id === "pos:one")?.position.x
    ).toBeGreaterThan(
      horizontal.nodes.find((n) => n.id === "dept:child")?.position.x ?? 0
    )
  })
})
