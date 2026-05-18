import { describe, expect, it } from "vitest"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"
import {
  buildOrgHealthIssuesListSurfaceConfiguration,
  buildOrgJobGradesListSurfaceConfiguration,
} from "#features/hrm/employee-management/organizational-chart-hierarchy/data/org-structure-list-surface.server"

const GRADE_ROW = {
  id: "grade-1",
  code: "G1",
  name: "Grade 1",
  ordinal: 1,
  minSalaryAmount: null,
  maxSalaryAmount: null,
  currency: "USD",
  benefitTierCode: null,
  archivedAt: null,
} as const

const gradesCopy = {
  empty: "No grades",
  colCode: "Code",
  colName: "Name",
  colOrdinal: "Ordinal",
  colSalaryBand: "Band",
  colBenefitTier: "Tier",
  colStatus: "Status",
  statusActive: "Active",
  statusArchived: "Archived",
} as const

describe("org structure list surface builders", () => {
  it("requires organization read on health issues list", () => {
    const config = buildOrgHealthIssuesListSurfaceConfiguration([], {
      empty: "No issues",
      colSeverity: "Severity",
      colIssue: "Issue",
      colDetail: "Detail",
      severityLabel: (severity) => severity.toUpperCase(),
    }) satisfies ListSurfaceRendererConfigurationInput

    expect(config.requiresErpPermission).toEqual({
      module: "hrm",
      object: "organization",
      function: "read",
    })
  })

  it("marks grade archive trailing ready when delete is allowed and row is active", () => {
    const config = buildOrgJobGradesListSurfaceConfiguration(
      [GRADE_ROW],
      gradesCopy,
      { canDelete: true, showActionsColumn: true }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })

  it("marks grade archive trailing disabled when row is archived", () => {
    const config = buildOrgJobGradesListSurfaceConfiguration(
      [{ ...GRADE_ROW, archivedAt: new Date("2026-01-01T00:00:00.000Z") }],
      gradesCopy,
      { canDelete: true, showActionsColumn: true }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction?.state).toBe("disabled")
  })

  it("omits grade trailing metadata when actions column is hidden", () => {
    const config = buildOrgJobGradesListSurfaceConfiguration(
      [GRADE_ROW],
      gradesCopy,
      { canDelete: false, showActionsColumn: false }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toBeUndefined()
  })
})
