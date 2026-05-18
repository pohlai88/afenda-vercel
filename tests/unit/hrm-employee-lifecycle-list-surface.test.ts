import { describe, expect, it } from "vitest"

import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { buildEmployeeLifecycleListSurfaceConfiguration } from "#features/hrm/employee-management/employee-lifecycle-management/data/employee-lifecycle-list-surface.server"
import type { EmployeeLifecycleOverviewRow } from "#features/hrm/employee-management/employee-lifecycle-management/data/employee-lifecycle-overview.queries.server"

const BASE_ROW = {
  employeeId: "emp-1",
  employeeNumber: "E001",
  legalName: "Aminah Rahman",
  employmentStatus: "probation",
  stage: "probation",
  effectiveDate: "2026-06-01",
  pendingTransitionCount: 1,
  lastWorkingDate: null,
  reason: "Probation review",
  approvalReference: "APR-42",
} as const satisfies EmployeeLifecycleOverviewRow

const COPY = {
  empty: "No employees",
  colEmployeeNumber: "Employee No.",
  colLegalName: "Employee",
  colEmploymentStatus: "Status",
  colStage: "Stage",
  colEffectiveDate: "Effective",
  colPending: "Pending",
  colLastWorkingDate: "Last working",
  colReason: "Reason",
  colApprovalReference: "Approval",
  stageLabels: { probation: "Probation" },
  emptyValue: "—",
} as const

describe("buildEmployeeLifecycleListSurfaceConfiguration", () => {
  it("parses lifecycle overview table with employee deep links", () => {
    const config = buildEmployeeLifecycleListSurfaceConfiguration(
      [BASE_ROW],
      "demo-org",
      COPY
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "employee",
      function: "search",
    })
    expect(parsed.data.rows).toHaveLength(1)
    expect(parsed.data.rows[0]?.cells.legalName).toBe("Aminah Rahman")
    expect(parsed.data.rows[0]?.cells.stage).toBe("Probation")
    expect(parsed.data.rows[0]?.rowHref).toBe("/o/demo-org/apps/hrm/employees/emp-1")
  })
})
