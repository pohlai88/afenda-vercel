import { describe, expect, it } from "vitest"

import { parseListSurfaceRendererConfiguration } from "#features/governed-surface"
import { buildOrgHealthIssuesListSurfaceConfiguration } from "#features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-list-surface.server"

describe("buildOrgHealthIssuesListSurfaceConfiguration", () => {
  it("parses health issue rows for governed list surface", () => {
    const config = buildOrgHealthIssuesListSurfaceConfiguration(
      [
        {
          id: "issue-1",
          severity: "critical",
          kind: "position_cycle",
          title: "Reporting cycle detected",
          detail: "Position P-01 reports to itself indirectly.",
          resourceType: "hrm_position",
          resourceId: "pos-1",
        },
      ],
      {
        empty: "No issues",
        colSeverity: "Severity",
        colIssue: "Issue",
        colDetail: "Detail",
        severityLabel: (severity) => severity.toUpperCase(),
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.rows[0]?.cells.severity).toBe("CRITICAL")
    expect(parsed.data.rows[0]?.cells.issue).toBe("Reporting cycle detected")
  })
})
