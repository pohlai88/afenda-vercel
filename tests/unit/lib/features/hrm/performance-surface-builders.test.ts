import { describe, expect, it } from "vitest"

import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"

import { buildPerformanceCycleListSurfaceConfiguration } from "#features/hrm/talent-management/performance-appraisals/data/performance-cycle-list-surface.server"
import { buildPerformanceReviewListSurfaceConfiguration } from "#features/hrm/talent-management/performance-appraisals/data/performance-review-list-surface.server"

const REVIEW_ROW = {
  reviewId: "rev-1",
  cycleId: "cycle-1",
  cycleName: "FY2026 H1",
  cycleState: "active" as const,
  reviewPipeline: "single" as const,
  employeeId: "emp-1",
  employeeLegalName: "Jane Doe",
  employeeLinkedUserId: "user-1",
  reviewerId: "user-reviewer",
  reviewerLegalName: "Alex Manager",
  reviewerEmployeeNumber: "E-100",
  state: "self_pending" as const,
  rating: null,
  notes: null,
  selfSubmittedAt: null,
  managerSubmittedAt: null,
  hrSubmittedAt: null,
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
}

describe("buildPerformanceReviewListSurfaceConfiguration", () => {
  it("parses review rows with trailing metadata and reviewer display", () => {
    const configuration = buildPerformanceReviewListSurfaceConfiguration(
      [REVIEW_ROW],
      {
        eyebrow: "HRM",
        title: "Reviews",
        description: "Performance reviews",
        empty: "No reviews",
        colCycle: "Cycle",
        colEmployee: "Employee",
        colReviewer: "Reviewer",
        colStage: "Stage",
        unassignedReviewer: "Unassigned",
      },
      { canUpdate: true, viewerUserId: "user-1" }
    )

    const parsed = parseListSurfaceRendererConfiguration(configuration)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.rows[0]?.id).toBe("rev-1")
    expect(parsed.data.rows[0]?.cells.reviewer).toBe("Alex Manager (E-100)")
    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "performance",
      function: "read",
    })
  })

  it("hides trailing metadata when no row actions apply", () => {
    const configuration = buildPerformanceReviewListSurfaceConfiguration(
      [{ ...REVIEW_ROW, cycleState: "closed" }],
      {
        eyebrow: "HRM",
        title: "Reviews",
        description: "Performance reviews",
        empty: "No reviews",
        colCycle: "Cycle",
        colEmployee: "Employee",
        colReviewer: "Reviewer",
        colStage: "Stage",
        unassignedReviewer: "Unassigned",
      },
      { canUpdate: true, viewerUserId: "user-1" }
    )

    const parsed = parseListSurfaceRendererConfiguration(configuration)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.rows[0]?.trailingAction).toEqual({ state: "hidden" })
  })
})

describe("buildPerformanceCycleListSurfaceConfiguration", () => {
  it("emits trailing metadata for draft cycles when user can update", () => {
    const configuration = buildPerformanceCycleListSurfaceConfiguration(
      [
        {
          id: "cycle-1",
          name: "FY2026 H1",
          state: "draft",
          reviewPipeline: "single",
          periodStart: new Date("2026-01-01T00:00:00.000Z"),
          periodEnd: new Date("2026-06-30T00:00:00.000Z"),
          activatedAt: null,
          closedAt: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      {
        eyebrow: "HRM",
        title: "Cycles",
        description: "Review cycles",
        empty: "No cycles",
        colName: "Name",
        colPeriod: "Period",
        colState: "State",
        colPipeline: "Pipeline",
        formatPeriod: () => "Jan – Jun",
        formatPipeline: () => "Single",
      },
      {
        canUpdate: true,
        readOnlyUpdateReason: "Read-only",
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(configuration)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
    expect(parsed.data.presentation?.variant).toBe("table-only")
  })
})
