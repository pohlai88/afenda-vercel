import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface/schemas/list-surface-renderer.schema.ts"
import { buildOtmEmbeddedListSurfaceErrorConfiguration } from "../../lib/features/hrm/time-attendance/overtime-management/data/otm-embedded-list-surface-error.server.ts"
import { buildOtmPendingListSurfaceConfiguration } from "../../lib/features/hrm/time-attendance/overtime-management/data/otm-surface-builders.server.ts"
import type { OrgOtmRequestRow } from "../../lib/features/hrm/time-attendance/overtime-management/data/otm.types.shared.ts"
import { HRM_OTM_DAY_CATEGORIES } from "../../lib/features/hrm/time-attendance/overtime-management/schemas/otm.schema.ts"

const dayCategoryLabels = Object.fromEntries(
  HRM_OTM_DAY_CATEGORIES.map((category) => [category, category])
) as Record<(typeof HRM_OTM_DAY_CATEGORIES)[number], string>

const pendingCopy = {
  columnsId: "hrm:overtime:pending",
  empty: "No pending",
  colEmployee: "Employee",
  colWorkDate: "Work date",
  colTimeRange: "Time",
  colDuration: "Duration",
  colDayCategory: "Category",
  colState: "Status",
  colRequested: "Requested",
  dayCategoryLabels,
  formatRequestedAt: (date: Date) => date.toISOString(),
  stateLabelFor: (state: string) => state,
  approvalStageLabels: {
    manager: "Manager",
    hr: "HR",
  },
}

describe("HRM OTM list-surface builders", () => {
  it("builds pending inbox metadata with trailing decide actions", () => {
    const rows = [
      orgOtmRequestRow({
        id: "otm-1",
        currentApproverUserId: "user-approver",
        approvalStage: "manager",
      }),
      orgOtmRequestRow({
        id: "otm-2",
        currentApproverUserId: "other-user",
      }),
    ]

    const config = buildOtmPendingListSurfaceConfiguration(rows, pendingCopy, {
      canApproveAll: false,
      currentUserId: "user-approver",
      decideLabel: "Decide",
    })

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "overtime",
      function: "read",
    })
    expect(parsed.data.rows).toHaveLength(2)

    const actionable = parsed.data.rows.find((row) => row.id === "otm-1")
    expect(actionable?.trailingAction?.state).toBe("ready")
    expect(actionable?.trailingAction?.descriptor?.id).toBe(
      "erp.hrm.overtime.decide"
    )

    const hidden = parsed.data.rows.find((row) => row.id === "otm-2")
    expect(hidden?.trailingAction?.state).toBe("hidden")
  })
})

describe("OTM embedded list-surface load errors", () => {
  it("builds a valid empty table configuration for Pattern C error states", () => {
    const config = buildOtmEmbeddedListSurfaceErrorConfiguration({
      columnsId: "hrm:overtime:pending",
      emptyTitle: "Nothing pending",
      firstColumn: { id: "employee", header: "Employee" },
    })

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.surface.columnsId).toBe("hrm:overtime:pending")
    expect(parsed.data.rows).toEqual([])
    expect(parsed.data.columns).toHaveLength(1)
  })
})

function orgOtmRequestRow(
  overrides: Partial<OrgOtmRequestRow> = {}
): OrgOtmRequestRow {
  return {
    id: "otm-default",
    employeeId: "emp-1",
    employeeNumber: "MY-00042",
    employeeFullName: "Aminah Binti Rahman",
    workDate: "2026-05-11",
    startTime: "18:00",
    endTime: "20:00",
    durationMinutes: 120,
    timingKind: "actual",
    dayCategory: "normal_day",
    reason: "Project deadline",
    state: "submitted",
    requestedAt: new Date("2026-05-11T01:00:00.000Z"),
    currentApprovalId: "approval-1",
    currentApproverUserId: "user-approver",
    approvalStage: "manager",
    ...overrides,
  } as const satisfies OrgOtmRequestRow
}
