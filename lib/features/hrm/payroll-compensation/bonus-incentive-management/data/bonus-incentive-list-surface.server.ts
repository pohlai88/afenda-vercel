import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import {
  formatBonusAmount,
  formatBonusDate,
} from "./bonus-incentive-display.shared"
import type {
  BonusClawbackRow,
  BonusCycleRow,
  BonusPayoutRow,
  BonusPlanRow,
  BonusReportSnapshot,
} from "./bonus-incentive.queries.server"

const BONUS_READ_PERMISSION = {
  module: "hrm" as const,
  object: "bonus_incentive" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function badgeColumn(id: string, header: string) {
  return {
    id,
    header,
    cellKind: { kind: "badge" as const, tone: "attention" as const },
  }
}

export function buildBonusPlansListSurfaceConfiguration(
  rows: readonly BonusPlanRow[],
  copy: {
    readonly empty: string
    readonly colCode: string
    readonly colName: string
    readonly colType: string
    readonly colFormula: string
    readonly colStatus: string
    readonly active: string
    readonly inactive: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BONUS_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-bonus-plans" },
      columnsId: "hrm-bonus-plans",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      badgeColumn("type", copy.colType),
      { id: "formula", header: copy.colFormula },
      badgeColumn("status", copy.colStatus),
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        name: row.name,
        type: row.planType.replaceAll("_", " "),
        formula: row.payoutFormulaType.replaceAll("_", " "),
        status: row.isActive ? copy.active : copy.inactive,
      },
    })),
  }
}

export function buildBonusCyclesListSurfaceConfiguration(
  rows: readonly BonusCycleRow[],
  copy: {
    readonly empty: string
    readonly colCode: string
    readonly colPlan: string
    readonly colPeriod: string
    readonly colPayout: string
    readonly colState: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BONUS_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-bonus-cycles" },
      columnsId: "hrm-bonus-cycles",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "plan", header: copy.colPlan },
      { id: "period", header: copy.colPeriod },
      { id: "payout", header: copy.colPayout, cellKind: { kind: "date" } },
      badgeColumn("state", copy.colState),
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        plan: `${row.planName} · ${row.planCode}`,
        period: `${formatBonusDate(row.periodStart)} - ${formatBonusDate(
          row.periodEnd
        )}`,
        payout: formatBonusDate(row.payoutDate),
        state: row.state.replaceAll("_", " "),
      },
      trailingAction:
        row.state === "open" || row.state === "calculated"
          ? { state: "ready" as const }
          : { state: "hidden" as const },
    })),
  }
}

export function buildBonusPayoutsListSurfaceConfiguration(
  rows: readonly BonusPayoutRow[],
  copy: {
    readonly empty: string
    readonly colEmployee: string
    readonly colPlan: string
    readonly colCalculated: string
    readonly colApproved: string
    readonly colState: string
    readonly colFlags: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BONUS_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-bonus-payouts" },
      columnsId: "hrm-bonus-payouts",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "plan", header: copy.colPlan },
      { id: "calculated", header: copy.colCalculated },
      { id: "approved", header: copy.colApproved },
      badgeColumn("state", copy.colState),
      { id: "flags", header: copy.colFlags },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: `${row.employeeLegalName} (${row.employeeNumber})`,
        plan: `${row.planName} · ${row.cycleName}`,
        calculated: formatBonusAmount(row.calculatedAmount, row.currency),
        approved: formatBonusAmount(row.approvedAmount, row.currency),
        state: row.state.replaceAll("_", " "),
        flags:
          row.validationFlags.length > 0
            ? String(row.validationFlags.length)
            : "-",
      },
      trailingAction:
        row.state !== "paid" && row.state !== "void"
          ? { state: "ready" as const }
          : { state: "hidden" as const },
    })),
  }
}

export function buildBonusClawbacksListSurfaceConfiguration(
  rows: readonly BonusClawbackRow[],
  copy: {
    readonly empty: string
    readonly colEmployee: string
    readonly colType: string
    readonly colAmount: string
    readonly colReason: string
    readonly colState: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: BONUS_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-bonus-clawbacks" },
      columnsId: "hrm-bonus-clawbacks",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "type", header: copy.colType },
      { id: "amount", header: copy.colAmount },
      { id: "reason", header: copy.colReason },
      badgeColumn("state", copy.colState),
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.employeeLegalName,
        type: row.clawbackType.replaceAll("_", " "),
        amount: formatBonusAmount(row.amount, row.currency),
        reason: row.reason,
        state: row.recoveryState.replaceAll("_", " "),
      },
    })),
  }
}

export function buildBonusReportsListSurfaceConfiguration(
  snapshot: BonusReportSnapshot,
  copy: {
    readonly colMetric: string
    readonly colValue: string
    readonly activePlans: string
    readonly cycles: string
    readonly payouts: string
    readonly pendingApproval: string
    readonly approvedAmount: string
    readonly exportedAmount: string
    readonly clawbackAmount: string
  }
): ListSurfaceRendererConfigurationInput {
  const rows = [
    {
      id: "active-plans",
      metric: copy.activePlans,
      value: `${snapshot.activePlanCount}/${snapshot.planCount}`,
    },
    { id: "cycles", metric: copy.cycles, value: String(snapshot.cycleCount) },
    {
      id: "payouts",
      metric: copy.payouts,
      value: String(snapshot.payoutCount),
    },
    {
      id: "pending",
      metric: copy.pendingApproval,
      value: String(snapshot.pendingApprovalCount),
    },
    {
      id: "approved",
      metric: copy.approvedAmount,
      value: snapshot.approvedAmount,
    },
    {
      id: "exported",
      metric: copy.exportedAmount,
      value: snapshot.exportedAmount,
    },
    {
      id: "clawback",
      metric: copy.clawbackAmount,
      value: snapshot.clawbackAmount,
    },
  ]
  return {
    dataNature: "table",
    requiresErpPermission: BONUS_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-bonus-reports" },
      columnsId: "hrm-bonus-reports",
      rowKey: "id",
      empty: { variant: "muted", title: "No report metrics." },
    },
    columns: [
      { id: "metric", header: copy.colMetric },
      { id: "value", header: copy.colValue },
    ],
    rows: rows.map((row) => ({ id: row.id, cells: row })),
  }
}
