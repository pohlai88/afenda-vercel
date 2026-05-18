import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface/schemas/list-surface-renderer.schema.ts"
import { buildAttendanceRecentListSurfaceConfiguration } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/attendance-list-surface.server.ts"
import { buildLeaveTypesPolicyListSurfaceConfiguration } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/leave-policy-list-surface.server.ts"
import {
  buildLeaveAbsenceCalendarListSurfaceConfiguration,
  buildLeavePendingListSurfaceConfiguration,
} from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/leave-list-surface.server.ts"
import { buildTimeReportPendingListSurfaceConfiguration } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/time-report-list-surface.server.ts"
import type { OrgLeaveRequestRow } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/leave-request.queries.server.ts"
import type { LeaveTypeAdminRow } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/leave-policy.queries.server.ts"
import type { OrgTimeReportRow } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/time-report.queries.server.ts"

describe("HRM LAM list-surface builders", () => {
  it("builds leave pending metadata with permission and trailing actions", () => {
    const rows = [
      leaveRequestRow({
        id: "leave-1",
        currentApproverUserId: "user-approver",
      }),
      leaveRequestRow({
        id: "leave-2",
        currentApproverUserId: "other-user",
      }),
    ]

    const config = buildLeavePendingListSurfaceConfiguration(
      rows,
      leavePendingCopy,
      {
        canApproveAll: false,
        currentUserId: "user-approver",
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "leave",
      function: "read",
    })
    expect(parsed.data.surface.columnsId).toBe("hrm-leave-pending-inbox")
    expect(parsed.data.rows.map((row) => row.id)).toEqual([
      "leave-1",
      "leave-2",
    ])
    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
    expect(parsed.data.rows[0]?.trailingAction?.descriptor?.id).toBe(
      "erp.hrm.leave.decide"
    )
    expect(parsed.data.rows[1]?.trailingAction?.state).toBe("hidden")
  })

  it("builds absence calendar metadata as a governed table", () => {
    const config = buildLeaveAbsenceCalendarListSurfaceConfiguration(
      [
        {
          id: "absence-1",
          employee: "Aminah Binti Rahman",
          employeeNumber: "MY-00042",
          leaveType: "ANNUAL",
          dates: "2026-06-10 -> 2026-06-12",
          duration: "3",
          state: "Approved",
        },
      ],
      {
        empty: "No approved absences",
        colEmployee: "Employee",
        colLeaveType: "Leave type",
        colDates: "Dates",
        colDuration: "Duration",
        colState: "State",
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.surface.columnsId).toBe("hrm-leave-absence-calendar")
    expect(parsed.data.surface.empty.title).toBe("No approved absences")
    expect(parsed.data.rows[0]?.id).toBe("absence-1")
    expect(parsed.data.rows[0]?.cells.employee).toBe(
      "Aminah Binti Rahman · MY-00042"
    )
    expect(parsed.data.columns.find((column) => column.id === "state")).toEqual(
      expect.objectContaining({
        cellKind: { kind: "badge", tone: "attention" },
      })
    )
  })

  it("builds attendance recent metadata with correction trailing actions", () => {
    const config = buildAttendanceRecentListSurfaceConfiguration(
      [
        {
          id: "event-1",
          employee: "Aminah Binti Rahman · MY-00042",
          eventType: "Clock in",
          occurredAt: "2026-05-11T09:00:00.000Z",
          source: "Manual",
          correction: "-",
          canCorrect: true,
        },
        {
          id: "event-2",
          employee: "Aminah Binti Rahman · MY-00042",
          eventType: "Correction",
          occurredAt: "2026-05-11T09:05:00.000Z",
          source: "Manual",
          correction: "Correction",
          canCorrect: false,
        },
      ],
      {
        empty: "No attendance events",
        colEmployee: "Employee",
        colEvent: "Event",
        colOccurredAt: "Occurred",
        colSource: "Source",
        colCorrectionOf: "Correction",
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "attendance",
      function: "read",
    })
    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
    expect(parsed.data.rows[0]?.trailingAction?.descriptor?.id).toBe(
      "erp.hrm.attendance.correct"
    )
    expect(parsed.data.rows[1]?.trailingAction?.state).toBe("hidden")
  })

  it("builds leave type policy metadata with edit trailing actions", () => {
    const config = buildLeaveTypesPolicyListSurfaceConfiguration(
      [
        {
          id: "type-1",
          code: "ANNUAL",
          accrualMethod: "annual_grant",
          paid: true,
          genderRestriction: null,
          tier1Days: 8,
          tier1MaxYears: 2,
          tier2Days: 12,
          tier2MaxYears: 5,
          tier3Days: 16,
          fixedDaysPerYear: null,
          maxCarryForwardDays: 5,
          carryForwardExpiryMonths: 6,
          archivedAt: null,
          createdAt: new Date("2026-05-11T01:00:00.000Z"),
          updatedAt: new Date("2026-05-11T01:00:00.000Z"),
        } satisfies LeaveTypeAdminRow,
      ],
      leaveTypesCopy,
      { canUpdate: true }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.surface.columnsId).toBe("hrm-leave-types-policy")
    expect(parsed.data.rows[0]?.id).toBe("type-1")
    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("ready")
    expect(parsed.data.rows[0]?.trailingAction?.descriptor?.id).toBe(
      "erp.hrm.leave_type.edit"
    )
  })

  it("builds time report metadata with attendance read permission", () => {
    const config = buildTimeReportPendingListSurfaceConfiguration(
      [
        {
          id: "report-1",
          employeeId: "employee-1",
          reportKind: "overtime",
          workDate: "2026-05-11",
          overtimeMinutes: 90,
          tripStartDate: null,
          tripEndDate: null,
          destination: null,
          reason: "Month close",
          state: "submitted",
          currentApprovalId: "approval-1",
          requestedAt: new Date("2026-05-11T01:00:00.000Z"),
          approvedAt: null,
          updatedAt: new Date("2026-05-11T01:00:00.000Z"),
          employeeNumber: "MY-00042",
          employeeFullName: "Aminah Binti Rahman",
        } satisfies OrgTimeReportRow,
      ],
      {
        empty: "No pending time reports",
        colEmployee: "Employee",
        colReportType: "Report",
        colDetail: "Detail",
        colRequested: "Requested",
        reportKindLabelFor: (kind) => kind,
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "attendance",
      function: "read",
    })
    expect(parsed.data.presentation).toEqual({
      variant: "table-only",
      tableDensity: "compact",
    })
    expect(parsed.data.rows[0]?.id).toBe("report-1")
  })
})

const leavePendingCopy = {
  empty: "No pending leave approvals",
  colEmployee: "Employee",
  colLeaveType: "Leave type",
  colDates: "Dates",
  colDuration: "Duration",
  colRequested: "Requested",
}

const leaveTypesCopy = {
  empty: "No leave types",
  colCode: "Code",
  colAccrual: "Accrual",
  colPaid: "Paid",
  colTiers: "Tiers",
  colCarryForward: "Carry forward",
  colStatus: "Status",
  ea2023Hint: "EA 2023",
  accrualLabel: (method: string) => method,
  paidYes: "Paid",
  paidNo: "Unpaid",
  statusActive: "Active",
  statusArchived: "Archived",
  tierLabel: (years: number, days: number) => `${years}+ years: ${days} days`,
  fixedDaysLabel: (days: number) => `${days} days`,
  carryForwardDays: (days: number) => `${days} days`,
  carryForwardExpiry: (months: number) => `expires after ${months} months`,
  carryForwardNone: "None",
}

function leaveRequestRow(
  overrides: Partial<OrgLeaveRequestRow>
): OrgLeaveRequestRow {
  return {
    id: "leave-1",
    employeeId: "employee-1",
    leaveTypeId: "leave-type-1",
    leaveTypeCode: "ANNUAL",
    requestedAt: new Date("2026-05-11T01:00:00.000Z"),
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    durationDays: "3.00",
    halfDay: "none",
    reason: "Annual leave",
    state: "submitted",
    currentApprovalId: "approval-1",
    approvedByUserId: null,
    approvedAt: null,
    rejectedReason: null,
    policyVersion: "MY-2026-01",
    createdAt: new Date("2026-05-11T01:00:00.000Z"),
    updatedAt: new Date("2026-05-11T01:00:00.000Z"),
    employeeNumber: "MY-00042",
    employeeFullName: "Aminah Binti Rahman",
    currentApproverUserId: "user-approver",
    ...overrides,
  } as const satisfies OrgLeaveRequestRow
}
