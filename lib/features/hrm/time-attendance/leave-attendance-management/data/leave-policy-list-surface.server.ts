import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import {
  isHrmLeaveAccrualMethod,
  isMyEa2023LeaveTypeCode,
} from "./leave-policy-display.shared"
import type { LeaveTypeAdminRow } from "./leave-policy.queries.server"

const LEAVE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "leave" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type LeaveTypesListCopy = {
  empty: string
  colCode: string
  colAccrual: string
  colPaid: string
  colTiers: string
  colCarryForward: string
  colStatus: string
  ea2023Hint: string
  accrualLabel: (method: string) => string
  paidYes: string
  paidNo: string
  statusActive: string
  statusArchived: string
  tierLabel: (years: number, days: number) => string
  fixedDaysLabel: (days: number) => string
  carryForwardDays: (days: number) => string
  carryForwardExpiry: (months: number) => string
  carryForwardNone: string
}

function formatEntitlementSummary(
  row: LeaveTypeAdminRow,
  copy: Pick<
    LeaveTypesListCopy,
    "tierLabel" | "fixedDaysLabel"
  >
): string {
  if (row.fixedDaysPerYear !== null) {
    return copy.fixedDaysLabel(row.fixedDaysPerYear)
  }
  const segments: string[] = []
  if (row.tier1Days !== null) {
    segments.push(copy.tierLabel(0, row.tier1Days))
  }
  if (row.tier2Days !== null && row.tier1MaxYears !== null) {
    segments.push(copy.tierLabel(row.tier1MaxYears, row.tier2Days))
  }
  if (row.tier3Days !== null && row.tier2MaxYears !== null) {
    segments.push(copy.tierLabel(row.tier2MaxYears, row.tier3Days))
  }
  return segments.length > 0 ? segments.join(" · ") : "—"
}

function formatCarryForwardSummary(
  row: LeaveTypeAdminRow,
  copy: Pick<
    LeaveTypesListCopy,
    "carryForwardDays" | "carryForwardExpiry" | "carryForwardNone"
  >
): string {
  if (row.maxCarryForwardDays === 0) {
    return copy.carryForwardNone
  }
  const days = copy.carryForwardDays(row.maxCarryForwardDays)
  if (row.carryForwardExpiryMonths !== null) {
    return `${days} ${copy.carryForwardExpiry(row.carryForwardExpiryMonths)}`
  }
  return days
}

export function buildLeaveTypesPolicyListSurfaceConfiguration(
  rows: readonly LeaveTypeAdminRow[],
  copy: LeaveTypesListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: LEAVE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-leave-types-policy" },
      columnsId: "hrm-leave-types-policy",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      {
        id: "accrual",
        header: copy.colAccrual,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "paid", header: copy.colPaid },
      { id: "tiers", header: copy.colTiers },
      { id: "carryForward", header: copy.colCarryForward },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => {
      const accrualLabel = isHrmLeaveAccrualMethod(row.accrualMethod)
        ? copy.accrualLabel(row.accrualMethod)
        : row.accrualMethod
      const codeDisplay = isMyEa2023LeaveTypeCode(row.code)
        ? `${row.code} (${copy.ea2023Hint})`
        : row.code
      return {
        id: row.id,
        cells: {
          code: codeDisplay,
          accrual: accrualLabel,
          paid: row.paid ? copy.paidYes : copy.paidNo,
          tiers: formatEntitlementSummary(row, copy),
          carryForward: formatCarryForwardSummary(row, copy),
          status:
            row.archivedAt === null ? copy.statusActive : copy.statusArchived,
        },
      }
    }),
  }
}
