import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { formatAbsenceRatePercent } from "./aat-analytics-engine.shared"
import type { AatRiskTier } from "../schemas/aat.schema"
import type {
  AatDepartmentRankingRow,
  AatExceptionTrendRow,
  AatHighRiskEmployeeRow,
  AatLeaveTypeBreakdownRow,
} from "./aat-analytics.queries.server"
import { AAT_LIST_SURFACE_IDS } from "./aat-surface-metadata.shared"

const AAT_READ_PERMISSION = {
  module: "hrm" as const,
  object: "absence_analytics" as const,
  function: "read" as const,
}

const TABLE_PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type DepartmentRankingCopy = {
  empty: string
  colDepartment: string
  colEmployees: string
  colLostDays: string
  colRate: string
  colRisk: string
  riskLabelFor: (tier: AatRiskTier) => string
}

export function buildAatDepartmentRankingListSurface(
  rows: readonly AatDepartmentRankingRow[],
  copy: DepartmentRankingCopy
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: AAT_READ_PERMISSION,
    presentation: TABLE_PRESENTATION,
    surface: {
      header: { title: AAT_LIST_SURFACE_IDS.departmentRanking },
      columnsId: AAT_LIST_SURFACE_IDS.departmentRanking,
      rowKey: "departmentId",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "department", header: copy.colDepartment },
      { id: "employees", header: copy.colEmployees, align: "end" },
      { id: "lostDays", header: copy.colLostDays, align: "end" },
      { id: "rate", header: copy.colRate, align: "end" },
      { id: "risk", header: copy.colRisk, align: "center" },
    ],
    rows: rows.map((row) => ({
      id: row.departmentId ?? "unassigned",
      cells: {
        department: row.departmentName,
        employees: String(row.employeeCount),
        lostDays: row.lostWorkdays.toFixed(1),
        rate: formatAbsenceRatePercent(row.absenceRate),
        risk: copy.riskLabelFor(row.riskTier),
      },
    })),
  }
}

type HighRiskCopy = {
  empty: string
  colEmployee: string
  colDepartment: string
  colFrequency: string
  colLostDays: string
  colRate: string
  colRisk: string
  colPatterns: string
  colReason: string
  riskLabelFor: (tier: AatRiskTier) => string
}

export function buildAatHighRiskEmployeesListSurface(
  rows: readonly AatHighRiskEmployeeRow[],
  copy: HighRiskCopy
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: AAT_READ_PERMISSION,
    presentation: TABLE_PRESENTATION,
    surface: {
      header: { title: AAT_LIST_SURFACE_IDS.highRiskEmployees },
      columnsId: AAT_LIST_SURFACE_IDS.highRiskEmployees,
      rowKey: "employeeId",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "department", header: copy.colDepartment },
      { id: "frequency", header: copy.colFrequency, align: "end" },
      { id: "lostDays", header: copy.colLostDays, align: "end" },
      { id: "rate", header: copy.colRate, align: "end" },
      { id: "risk", header: copy.colRisk, align: "center" },
      { id: "patterns", header: copy.colPatterns },
      { id: "reason", header: copy.colReason },
    ],
    rows: rows.map((row) => ({
      id: row.employeeId,
      cells: {
        employee: row.employeeLabel,
        department: row.departmentName,
        frequency: String(row.absenceFrequency),
        lostDays: row.lostWorkdays.toFixed(1),
        rate: formatAbsenceRatePercent(row.absenceRate),
        risk: copy.riskLabelFor(row.riskTier),
        patterns: row.patternFlags.join(", ") || "—",
        reason: row.recentAbsenceReason,
      },
    })),
  }
}

type LeaveTypeBreakdownCopy = {
  empty: string
  colLeaveType: string
  colLostDays: string
  colFrequency: string
  labelFor: (code: string) => string
}

export function buildAatLeaveTypeBreakdownListSurface(
  rows: readonly AatLeaveTypeBreakdownRow[],
  copy: LeaveTypeBreakdownCopy
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: AAT_READ_PERMISSION,
    presentation: TABLE_PRESENTATION,
    surface: {
      header: { title: AAT_LIST_SURFACE_IDS.leaveTypeBreakdown },
      columnsId: AAT_LIST_SURFACE_IDS.leaveTypeBreakdown,
      rowKey: "leaveTypeCode",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "leaveType", header: copy.colLeaveType },
      { id: "lostDays", header: copy.colLostDays, align: "end" },
      { id: "frequency", header: copy.colFrequency, align: "end" },
    ],
    rows: rows.map((row) => ({
      id: row.leaveTypeCode,
      cells: {
        leaveType: copy.labelFor(row.leaveTypeCode),
        lostDays: row.lostWorkdays.toFixed(1),
        frequency: String(row.absenceFrequency),
      },
    })),
  }
}

type ExceptionTrendCopy = {
  empty: string
  colKind: string
  colCount: string
  labelFor: (kind: string) => string
}

export function buildAatExceptionTrendsListSurface(
  rows: readonly AatExceptionTrendRow[],
  copy: ExceptionTrendCopy
): ListSurfaceRendererConfigurationInput {
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: AAT_READ_PERMISSION,
    presentation: TABLE_PRESENTATION,
    surface: {
      header: { title: AAT_LIST_SURFACE_IDS.exceptionTrends },
      columnsId: AAT_LIST_SURFACE_IDS.exceptionTrends,
      rowKey: "exceptionKind",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "kind", header: copy.colKind },
      { id: "count", header: copy.colCount, align: "end" },
    ],
    rows: rows.map((row) => ({
      id: row.exceptionKind,
      cells: {
        kind: copy.labelFor(row.exceptionKind),
        count: String(row.count),
      },
    })),
  }
}
