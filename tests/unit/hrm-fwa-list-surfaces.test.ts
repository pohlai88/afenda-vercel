import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface/schemas/list-surface-renderer.schema.ts"
import { FWA_LIST_SURFACE_IDS } from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/data/fwa-surface-metadata.shared.ts"
import {
  buildFwaActiveListSurfaceConfiguration,
  buildFwaActiveManageListSurfaceConfiguration,
  buildFwaArrangementTypesListSurfaceConfiguration,
  buildFwaKpiStatConfiguration,
  buildFwaPendingListSurfaceConfiguration,
} from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/data/fwa-surface-builders.server.ts"
import type { OrgFwaRequestRow } from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/data/fwa.types.shared.ts"

const listCopy = {
  empty: "Empty",
  colEmployee: "Employee",
  colType: "Type",
  colDates: "Dates",
  colState: "State",
  colRequested: "Requested",
  stateLabelFor: (state: string) => state,
  formatRequestedAt: (date: Date) => date.toISOString(),
}

describe("HRM FWA list-surface builders", () => {
  it("builds KPI stat configuration", () => {
    const config = buildFwaKpiStatConfiguration(
      {
        pendingCount: 2,
        activeCount: 5,
        typesCount: 7,
        expiringWithin30DaysCount: 1,
        complianceGapCount: 3,
      },
      {
        pending: "Pending",
        active: "Active",
        types: "Types",
        expiring: "Expiring",
        complianceGap: "Compliance gaps",
      }
    )

    expect(config.stats).toHaveLength(5)
    expect(config.stats[0]?.value).toBe("2")
    expect(config.stats[0]?.tone).toBe("attention")
  })

  it("builds arrangement types metadata with shared columnsId", () => {
    const config = buildFwaArrangementTypesListSurfaceConfiguration(
      [
        {
          id: "type-1",
          code: "HYBRID_STD",
          label: "Standard hybrid",
          arrangementKind: "hybrid",
          requiresRemoteLocation: false,
          requiresSupportingDocument: false,
        },
      ],
      {
        empty: "No types",
        colCode: "Code",
        colLabel: "Label",
        colKind: "Kind",
        colRemoteRequired: "Remote",
        kindLabelFor: () => "Hybrid",
        yesNo: (value) => (value ? "Yes" : "No"),
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.surface.columnsId).toBe(FWA_LIST_SURFACE_IDS.types)
    expect(parsed.data.rows[0]?.cells.kind).toBe("Hybrid")
  })

  it("builds pending inbox metadata with trailing actions and cellKinds", () => {
    const rows: OrgFwaRequestRow[] = [
      fwaRequestRow({
        id: "fwa-1",
        currentApproverUserId: "user-approver",
      }),
      fwaRequestRow({
        id: "fwa-2",
        currentApproverUserId: "other-user",
      }),
    ]

    const config = buildFwaPendingListSurfaceConfiguration(rows, listCopy, {
      canApproveAll: false,
      currentUserId: "user-approver",
      decideLabel: "Decide",
    })

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "flexible_work",
      function: "read",
    })
    expect(parsed.data.surface.columnsId).toBe(
      FWA_LIST_SURFACE_IDS.pendingInbox
    )
    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
    expect(parsed.data.rows[1]?.trailingAction?.state).toBe("hidden")
  })

  it("builds active list metadata with formatted requested cells", () => {
    const requestedAt = new Date("2026-05-11T09:00:00.000Z")
    const config = buildFwaActiveListSurfaceConfiguration(
      [
        fwaRequestRow({
          id: "fwa-active",
          requestedAt,
        }),
      ],
      listCopy
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.surface.columnsId).toBe(FWA_LIST_SURFACE_IDS.active)
    expect(parsed.data.rows[0]?.cells.requested).toBe(requestedAt.toISOString())
  })

  it("builds active manage metadata with lifecycle trailing actions", () => {
    const config = buildFwaActiveManageListSurfaceConfiguration(
      [
        fwaRequestRow({ id: "fwa-active", state: "active" }),
        fwaRequestRow({ id: "fwa-submitted", state: "submitted" }),
      ],
      listCopy,
      { canManageLifecycle: true, manageLabel: "Manage" }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    const activeRow = parsed.data.rows.find((row) => row.id === "fwa-active")
    const submittedRow = parsed.data.rows.find(
      (row) => row.id === "fwa-submitted"
    )
    expect(activeRow?.trailingAction?.state).toBe("ready")
    expect(submittedRow?.trailingAction?.state).toBe("hidden")
  })
})

function fwaRequestRow(
  overrides: Partial<OrgFwaRequestRow> = {}
): OrgFwaRequestRow {
  return {
    id: "fwa-default",
    employeeId: "emp-1",
    employeeNumber: "MY-00001",
    employeeFullName: "Aminah Binti Rahman",
    arrangementTypeId: "type-1",
    arrangementTypeLabel: "Standard hybrid",
    arrangementTypeCode: "HYBRID_STD",
    arrangementKind: "hybrid",
    reason: "Pilot hybrid schedule",
    remoteLocation: null,
    startDate: "2026-06-01",
    endDate: null,
    requestedAt: new Date("2026-06-01T08:00:00.000Z"),
    state: "submitted",
    currentApprovalId: null,
    currentApproverUserId: "user-approver",
    ...overrides,
  }
}
