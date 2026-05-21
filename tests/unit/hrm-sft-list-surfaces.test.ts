import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface/schemas/list-surface-renderer.schema.ts"
import { buildSftEmbeddedListSurfaceErrorConfiguration } from "../../lib/features/hrm/time-attendance/shift-scheduling/data/sft-embedded-list-surface-error.server.ts"
import { buildSftSwapPendingListSurfaceConfiguration } from "../../lib/features/hrm/time-attendance/shift-scheduling/data/sft-surface-builders.server.ts"
import { SFT_LIST_SURFACE_IDS } from "../../lib/features/hrm/time-attendance/shift-scheduling/data/sft-surface-metadata.shared.ts"
import type { ShiftSwapRequestRow } from "../../lib/features/hrm/time-attendance/shift-scheduling/data/sft-swap.queries.server.ts"

describe("HRM SFT list-surface builders", () => {
  it("builds swap pending inbox with trailing decide actions", () => {
    const rows = [
      swapRequestRow({ id: "swap-1" }),
      swapRequestRow({ id: "swap-2" }),
    ]

    const config = buildSftSwapPendingListSurfaceConfiguration(rows, {
      empty: "No pending",
      colRequester: "Requester",
      colCounterparty: "Counterparty",
      colDates: "Dates",
      colShifts: "Shifts",
      colReason: "Reason",
      colRequested: "Requested",
      actionLabel: "Decide",
      formatRequestedAt: (date) => date.toISOString(),
    })

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.surface.columnsId).toBe(SFT_LIST_SURFACE_IDS.swapPending)
    expect(parsed.data.rows).toHaveLength(2)
    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
  })
})

describe("SFT embedded list-surface load errors", () => {
  it("builds a valid empty table configuration for Pattern B/C error states", () => {
    const config = buildSftEmbeddedListSurfaceErrorConfiguration({
      columnsId: SFT_LIST_SURFACE_IDS.roster,
      emptyTitle: "Nothing scheduled",
      firstColumn: { id: "date", header: "Date" },
    })

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.surface.columnsId).toBe(SFT_LIST_SURFACE_IDS.roster)
    expect(parsed.data.rows).toEqual([])
    expect(parsed.data.columns).toHaveLength(1)
  })
})

function swapRequestRow(
  overrides: Partial<ShiftSwapRequestRow> = {}
): ShiftSwapRequestRow {
  return {
    id: "swap-default",
    organizationId: "org-1",
    state: "pending",
    reason: "Family event",
    rejectedReason: null,
    requesterEmployeeId: "emp-1",
    requesterAssignmentId: "asg-1",
    counterpartyEmployeeId: "emp-2",
    counterpartyAssignmentId: "asg-2",
    currentApprovalId: null,
    requesterName: "Aminah",
    requesterNumber: "MY-00042",
    counterpartyName: "Ben",
    requesterDate: "2026-05-11",
    counterpartyDate: "2026-05-12",
    requesterTemplateCode: "DAY",
    counterpartyTemplateCode: "EVE",
    createdAt: new Date("2026-05-11T01:00:00.000Z"),
    ...overrides,
  } as const satisfies ShiftSwapRequestRow
}
