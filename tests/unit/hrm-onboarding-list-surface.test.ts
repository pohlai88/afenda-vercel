import { describe, expect, it } from "vitest"

import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { buildOnboardingListSurfaceConfiguration } from "#features/hrm/employee-management/employee-lifecycle-management/data/onboarding-list-surface.server"
import type { OnboardingContractRow } from "#features/hrm/employee-management/employee-lifecycle-management/data/onboarding.queries.server"

const BASE_ROW = {
  contractId: "contract-1",
  employeeId: "emp-1",
  legalName: "Aminah Rahman",
  onboardingChecklist: { completedSteps: ["equipment_handoff"] },
} as const satisfies OnboardingContractRow

describe("buildOnboardingListSurfaceConfiguration", () => {
  it("parses table configuration with trailing action metadata", () => {
    const config = buildOnboardingListSurfaceConfiguration(
      [BASE_ROW],
      {
        empty: "No contracts",
        colEmployee: "Employee",
        colCompleted: "Completed",
        readOnlyUpdateReason: "Read only",
      },
      { canUpdate: true }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.__schemaVersion).toBeGreaterThan(0)
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "onboarding",
      function: "read",
    })
    expect(parsed.data.rows).toHaveLength(1)
    expect(parsed.data.rows[0]?.cells.employee).toBe("Aminah Rahman")
    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
  })

  it("marks trailing action disabled when update is not allowed", () => {
    const config = buildOnboardingListSurfaceConfiguration(
      [BASE_ROW],
      {
        empty: "No contracts",
        colEmployee: "Employee",
        colCompleted: "Completed",
        readOnlyUpdateReason: "Read only",
      },
      { canUpdate: false }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("disabled")
  })
})
