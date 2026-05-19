import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface/schemas/list-surface-renderer.schema.ts"
import { FWA_LIST_SURFACE_IDS } from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/data/fwa-surface-metadata.shared.ts"
import {
  buildFwaActiveListSurfaceConfiguration,
  buildFwaArrangementTypesListSurfaceConfiguration,
  buildFwaPendingListSurfaceConfiguration,
} from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/data/fwa-list-surface.server.ts"
import type { OrgFwaRequestRow } from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/data/fwa.queries.server.ts"

const listCopy = {
  empty: "Empty",
  colEmployee: "Employee",
  colType: "Type",
  colDates: "Dates",
  colState: "State",
  colRequested: "Requested",
  stateLabelFor: (state: string) => state,
}

describe("HRM FWA list-surface builders", () => {
  it("builds arrangement types metadata with shared columnsId", () => {
    const config = buildFwaArrangementTypesListSurfaceConfiguration(
      [
        {
          id: "type-1",
          code: "HYBRID_STD",
          label: "Standard hybrid",
          arrangementKind: "hybrid",
          requiresRemoteLocation: false,
        },
      ],
      {
        empty: "No types",
        colCode: "Code",
        colLabel: "Label",
        colKind: "Kind",
        colRemoteRequired: "Remote",
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.surface.columnsId).toBe(FWA_LIST_SURFACE_IDS.types)
    expect(parsed.data.columns.find((column) => column.id === "kind")).toEqual(
      expect.objectContaining({
        cellKind: { kind: "badge", tone: "default" },
      })
    )
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
    expect(parsed.data.columns.find((column) => column.id === "state")).toEqual(
      expect.objectContaining({
        cellKind: { kind: "badge", tone: "attention" },
      })
    )
    expect(
      parsed.data.columns.find((column) => column.id === "requested")
    ).toEqual(
      expect.objectContaining({
        cellKind: { kind: "datetime" },
      })
    )
  })

  it("builds active list metadata with ISO datetime requested cells", () => {
    const config = buildFwaActiveListSurfaceConfiguration(
      [
        fwaRequestRow({
          id: "fwa-active",
          requestedAt: new Date("2026-05-11T09:00:00.000Z"),
        }),
      ],
      listCopy
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.surface.columnsId).toBe(FWA_LIST_SURFACE_IDS.active)
    expect(parsed.data.rows[0]?.cells.requested).toBe(
      "2026-05-11T09:00:00.000Z"
    )
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
    currentApproverUserId: "user-approver",
    ...overrides,
  }
}
