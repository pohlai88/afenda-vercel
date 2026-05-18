import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { KpiPeriodRow, KpiScoreListRow } from "./kpi.queries.server"

const KPI_READ_PERMISSION = {
  module: "hrm" as const,
  object: "kpi" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type KpiPeriodsListCopy = {
  empty: string
  colName: string
  colRange: string
  colState: string
  formatRange: (period: KpiPeriodRow) => string
}

export function buildKpiPeriodsListSurfaceConfiguration(
  periods: readonly KpiPeriodRow[],
  copy: KpiPeriodsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: KPI_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-kpi-periods" },
      columnsId: "hrm-kpi-periods",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "range", header: copy.colRange },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: periods.map((period) => ({
      id: period.id,
      cells: {
        name: period.name,
        range: copy.formatRange(period),
        state: period.state,
      },
    })),
  }
}

type KpiScoresListCopy = {
  empty: string
  colEmployee: string
  colMetric: string
  colTargets: string
  formatTargets: (score: KpiScoreListRow) => string
}

export function buildKpiScoresListSurfaceConfiguration(
  scores: readonly KpiScoreListRow[],
  copy: KpiScoresListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: KPI_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-kpi-scores" },
      columnsId: "hrm-kpi-scores",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "metric", header: copy.colMetric },
      { id: "targets", header: copy.colTargets },
    ],
    rows: scores.map((score) => ({
      id: score.id,
      cells: {
        employee: score.employeeLegalName,
        metric: score.metricCode,
        targets: copy.formatTargets(score),
      },
    })),
  }
}
