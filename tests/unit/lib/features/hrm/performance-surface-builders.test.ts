import { describe, expect, it } from "vitest"

import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"

import { buildPerformanceReviewListSurfaceConfiguration } from "#features/hrm/talent-management/performance-management/data/performance-review-list-surface.server"

describe("buildPerformanceReviewListSurfaceConfiguration", () => {
  it("parses review rows for Pattern C trailing actions", () => {
    const configuration = buildPerformanceReviewListSurfaceConfiguration(
      [
        {
          reviewId: "rev-1",
          cycleId: "cycle-1",
          cycleName: "FY2026 H1",
          cycleState: "active",
          reviewPipeline: "single",
          employeeId: "emp-1",
          employeeLegalName: "Jane Doe",
          employeeLinkedUserId: "user-1",
          reviewerId: "user-reviewer",
          state: "self_pending",
          rating: null,
          notes: null,
          selfSubmittedAt: null,
          managerSubmittedAt: null,
          hrSubmittedAt: null,
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        },
      ],
      {
        eyebrow: "HRM",
        title: "Reviews",
        description: "Performance reviews",
        empty: "No reviews",
        colCycle: "Cycle",
        colEmployee: "Employee",
        colReviewer: "Reviewer",
        colStage: "Stage",
        formatReviewer: (id) => id.slice(0, 8),
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(configuration)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.rows[0]?.id).toBe("rev-1")
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "performance",
      function: "read",
    })
  })
})
