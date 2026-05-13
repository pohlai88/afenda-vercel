import { describe, expect, it } from "vitest"

import {
  groupPlannerEvidenceGraphForDisplay,
  type PlannerEvidenceGraph,
} from "#features/planner"

describe("groupPlannerEvidenceGraphForDisplay", () => {
  it("partitions nodes into causal lanes", () => {
    const t0 = new Date("2026-01-02T00:00:00.000Z")
    const t1 = new Date("2026-01-03T00:00:00.000Z")
    const graph: PlannerEvidenceGraph = {
      nodes: [
        {
          id: "c1",
          kind: "comment",
          label: "Note",
          description: "body",
          occurredAt: t0,
          href: null,
        },
        {
          id: "l1",
          kind: "erp_link",
          label: "HRM",
          description: "reason",
          occurredAt: t1,
          href: "/x",
        },
      ],
      summary: {
        linkCount: 1,
        relationCount: 0,
        activityCount: 0,
        sessionCount: 0,
        attachmentCount: 0,
        noticeCount: 0,
      },
    }

    const sections = groupPlannerEvidenceGraphForDisplay(graph)
    expect(sections.map((s) => s.lane)).toEqual(["erp", "operator"])
    expect(sections[0].nodes.map((n) => n.id)).toEqual(["l1"])
    expect(sections[1].nodes.map((n) => n.id)).toEqual(["c1"])
  })
})
