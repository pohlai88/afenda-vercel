import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface/schemas/list-surface-renderer.schema.ts"
import { buildCareerPathingEmbeddedListSurfaceErrorConfiguration } from "../../lib/features/hrm/talent-management/career-pathing-development-plans/data/career-pathing-embedded-list-surface-error.server.ts"
import {
  buildCareerPathFrameworksListSurfaceConfiguration,
  buildCareerPathStagesListSurfaceConfiguration,
  buildPlanGoalsListSurfaceConfiguration,
} from "../../lib/features/hrm/talent-management/career-pathing-development-plans/data/career-pathing-list-surface.server.ts"
import { CAREER_PATHING_LIST_SURFACE_IDS } from "../../lib/features/hrm/talent-management/career-pathing-development-plans/data/career-pathing-surface-metadata.shared.ts"
import type { DevelopmentGoalRow } from "../../lib/features/hrm/talent-management/career-pathing-development-plans/data/career-pathing.types.shared.ts"

const planGoalsCopy = {
  empty: "No goals",
  colTitle: "Goal",
  colType: "Type",
  colStatus: "Status",
  colMilestones: "Milestones",
  colDue: "Due",
  formatDue: (value: Date) => value.toISOString(),
}

describe("HRM career-pathing list-surface builders", () => {
  it("builds plan goals metadata with ready trailing actions for open goals", () => {
    const goals = [
      developmentGoalRow({ id: "goal-1", status: "not_started" }),
      developmentGoalRow({ id: "goal-2", status: "completed" }),
    ]

    const config = buildPlanGoalsListSurfaceConfiguration(goals, planGoalsCopy)
    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "career_path",
      function: "read",
    })

    const open = parsed.data.rows.find((row) => row.id === "goal-1")
    expect(open?.trailingAction?.state).toBe("ready")

    const done = parsed.data.rows.find((row) => row.id === "goal-2")
    expect(done?.trailingAction).toBeUndefined()
  })
})

describe("career-pathing framework and stage list surfaces", () => {
  it("exposes trailing actions for draft, active, and archived frameworks", () => {
    const config = buildCareerPathFrameworksListSurfaceConfiguration(
      [
        {
          id: "fw-draft",
          code: "ENG",
          name: "Engineering",
          description: null,
          pathKind: "vertical",
          status: "draft",
          stageCount: 0,
        },
        {
          id: "fw-archived",
          code: "OPS",
          name: "Operations",
          description: null,
          pathKind: "lateral",
          status: "archived",
          stageCount: 2,
        },
      ],
      {
        title: "Frameworks",
        description: "",
        empty: "Empty",
        colCode: "Code",
        colName: "Name",
        colKind: "Kind",
        colStatus: "Status",
        colStages: "Stages",
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.rows.find((r) => r.id === "fw-draft")?.trailingAction).toEqual(
      { state: "ready" }
    )
    expect(
      parsed.data.rows.find((r) => r.id === "fw-archived")?.trailingAction
    ).toEqual({ state: "ready" })
  })

  it("builds stage rows with delete trailing actions", () => {
    const config = buildCareerPathStagesListSurfaceConfiguration(
      [
        {
          id: "stage-1",
          frameworkId: "fw-1",
          sequence: 1,
          title: "Associate",
          description: null,
          targetGradeRef: "G3",
          expectedMonths: 12,
        },
      ],
      {
        title: "Stages",
        description: "",
        empty: "No stages",
        colSequence: "Step",
        colTitle: "Title",
        colGrade: "Grade",
        colMonths: "Months",
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
    expect(parsed.data.surface.columnsId).toBe("hrm-career-path-framework-stages")
  })
})

describe("Career-pathing embedded list-surface load errors", () => {
  it("builds a valid empty table configuration for Pattern C error states", () => {
    const config = buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
      columnsId: CAREER_PATHING_LIST_SURFACE_IDS.frameworks,
      emptyTitle: "Unavailable",
      firstColumn: { id: "name", header: "Name" },
    })

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.rows).toHaveLength(0)
    expect(parsed.data.surface.columnsId).toBe(
      CAREER_PATHING_LIST_SURFACE_IDS.frameworks
    )
  })
})

function developmentGoalRow(
  overrides: Partial<DevelopmentGoalRow>
): DevelopmentGoalRow {
  return {
    id: "goal-default",
    planId: "plan-1",
    title: "Goal",
    goalType: "skill",
    status: "not_started",
    targetDate: null,
    milestoneCount: 0,
    ...overrides,
  } as const satisfies DevelopmentGoalRow
}
