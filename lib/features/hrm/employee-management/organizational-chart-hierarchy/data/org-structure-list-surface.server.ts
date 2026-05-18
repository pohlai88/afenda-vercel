import "server-only"

import {
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import type {
  JobGradeListRow,
  OrgStructureEmployeePlacementRow,
  OrgStructureHealthIssue,
  OrgUnitTreeRow,
  PositionListRow,
} from "./org-structure.queries.server"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

const ORG_STRUCTURE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "organization" as const,
  function: "read" as const,
}

type OrgStructureTrailingListContext = {
  canDelete: boolean
  showActionsColumn: boolean
}

function salaryBandLabel(row: {
  minSalaryAmount: string | null
  maxSalaryAmount: string | null
  currency: string
}): string {
  if (!row.minSalaryAmount && !row.maxSalaryAmount) return "—"
  return `${row.currency} ${row.minSalaryAmount ?? "0"} — ${row.maxSalaryAmount ?? "open"}`
}

type OrgJobGradesListCopy = {
  empty: string
  colCode: string
  colName: string
  colOrdinal: string
  colSalaryBand: string
  colBenefitTier: string
  colStatus: string
  statusActive: string
  statusArchived: string
}

export function buildOrgJobGradesListSurfaceConfiguration(
  rows: readonly JobGradeListRow[],
  copy: OrgJobGradesListCopy,
  context: OrgStructureTrailingListContext
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: ORG_STRUCTURE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-org-job-grades" },
      columnsId: "hrm-org-job-grades",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "ordinal", header: copy.colOrdinal, align: "end" },
      { id: "salaryBand", header: copy.colSalaryBand },
      { id: "benefitTier", header: copy.colBenefitTier },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        name: row.name,
        ordinal: String(row.ordinal),
        salaryBand: salaryBandLabel(row),
        benefitTier: row.benefitTierCode ?? "—",
        status: row.archivedAt ? copy.statusArchived : copy.statusActive,
      },
      trailingAction: context.showActionsColumn
        ? resolveListSurfaceRowTrailingAction({
            visible: true,
            allowed: context.canDelete && !row.archivedAt,
          })
        : undefined,
    })),
  }
}

type OrgPositionsListCopy = {
  empty: string
  colCode: string
  colTitle: string
  colDepartment: string
  colReportsTo: string
  colGrade: string
  colBudget: string
  colOccupied: string
  colStatus: string
  occupancyLabel: (state: string) => string
  statusArchived: string
}

export function buildOrgPositionsListSurfaceConfiguration(
  rows: readonly PositionListRow[],
  copy: OrgPositionsListCopy,
  context: OrgStructureTrailingListContext
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: ORG_STRUCTURE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-org-positions" },
      columnsId: "hrm-org-positions",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "title", header: copy.colTitle },
      { id: "department", header: copy.colDepartment },
      { id: "reportsTo", header: copy.colReportsTo },
      { id: "grade", header: copy.colGrade },
      { id: "budget", header: copy.colBudget, align: "end" },
      { id: "occupied", header: copy.colOccupied, align: "end" },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        title: row.title,
        department: row.departmentCode ?? "—",
        reportsTo: row.reportsToPositionCode ?? "—",
        grade: row.defaultGradeCode ?? "—",
        budget: row.headcountBudget != null ? String(row.headcountBudget) : "—",
        occupied: String(row.occupancyCount),
        status: row.archivedAt
          ? copy.statusArchived
          : copy.occupancyLabel(row.positionStatus),
      },
      trailingAction: context.showActionsColumn
        ? resolveListSurfaceRowTrailingAction({
            visible: true,
            allowed: context.canDelete && !row.archivedAt,
          })
        : undefined,
    })),
  }
}

type OrgAssignmentsListCopy = {
  empty: string
  colEmployee: string
  colDepartment: string
  colPosition: string
  colGrade: string
  colManager: string
}

export function buildOrgAssignmentsListSurfaceConfiguration(
  rows: readonly OrgStructureEmployeePlacementRow[],
  copy: OrgAssignmentsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: ORG_STRUCTURE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-org-assignments" },
      columnsId: "hrm-org-assignments",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "department", header: copy.colDepartment },
      { id: "position", header: copy.colPosition },
      { id: "grade", header: copy.colGrade },
      { id: "manager", header: copy.colManager },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.label,
        department: row.departmentCode ?? "—",
        position: row.positionCode ?? "—",
        grade: row.jobGradeCode ?? "—",
        manager: row.managerLabel ?? "—",
      },
    })),
  }
}

type OrgReportingListCopy = {
  empty: string
  colPosition: string
  colReportsTo: string
  colDepartment: string
  colOccupied: string
}

export function buildOrgReportingListSurfaceConfiguration(
  rows: readonly PositionListRow[],
  copy: OrgReportingListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: ORG_STRUCTURE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-org-reporting" },
      columnsId: "hrm-org-reporting",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "position", header: copy.colPosition },
      { id: "reportsTo", header: copy.colReportsTo },
      { id: "department", header: copy.colDepartment },
      { id: "occupied", header: copy.colOccupied, align: "end" },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        position: `${row.code} — ${row.title}`,
        reportsTo: row.reportsToPositionCode ?? "—",
        department: row.departmentCode ?? "—",
        occupied: String(row.occupancyCount),
      },
    })),
  }
}

type OrgUnitsListCopy = {
  empty: string
  colCode: string
  colName: string
  colParent: string
  colHead: string
  colCostCenter: string
  colPositions: string
  colEmployees: string
  colStatus: string
  statusActive: string
  statusArchived: string
}

export function buildOrgUnitsListSurfaceConfiguration(
  rows: readonly OrgUnitTreeRow[],
  copy: OrgUnitsListCopy,
  context: OrgStructureTrailingListContext
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: ORG_STRUCTURE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-org-units" },
      columnsId: "hrm-org-units",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "parent", header: copy.colParent },
      { id: "head", header: copy.colHead },
      { id: "costCenter", header: copy.colCostCenter },
      { id: "positions", header: copy.colPositions, align: "end" },
      { id: "employees", header: copy.colEmployees, align: "end" },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        name: row.name,
        parent: row.parentCode ?? "—",
        head: row.headEmployeeLabel ?? "—",
        costCenter: row.costCenterCode ?? "—",
        positions: String(row.activePositionCount),
        employees: String(row.activeEmployeeCount),
        status: row.archivedAt ? copy.statusArchived : copy.statusActive,
      },
      trailingAction: context.showActionsColumn
        ? resolveListSurfaceRowTrailingAction({
            visible: true,
            allowed: context.canDelete && !row.archivedAt,
          })
        : undefined,
    })),
  }
}

type OrgHealthIssuesListCopy = {
  empty: string
  colSeverity: string
  colIssue: string
  colDetail: string
  severityLabel: (severity: OrgStructureHealthIssue["severity"]) => string
}

export function buildOrgHealthIssuesListSurfaceConfiguration(
  rows: readonly OrgStructureHealthIssue[],
  copy: OrgHealthIssuesListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: ORG_STRUCTURE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-org-health-issues" },
      columnsId: "hrm-org-health-issues",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "severity", header: copy.colSeverity, align: "center" },
      { id: "issue", header: copy.colIssue },
      { id: "detail", header: copy.colDetail },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        severity: copy.severityLabel(row.severity),
        issue: row.title,
        detail: row.detail,
      },
    })),
  }
}
