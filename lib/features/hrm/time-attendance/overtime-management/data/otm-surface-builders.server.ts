import "server-only"

import {
  GOVERNED_METADATA_SCHEMA_VERSION,
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import {
  formatOvertimeDurationMinutes,
  otmDayCategoryLabel,
} from "./otm-display.shared"
import { OTM_LIST_SURFACE_IDS } from "./otm-surface-metadata.shared"
import { formatOtmMultiplierLabel } from "./otm-calculation.shared"
import type { OtmExceptionInboxRow } from "./otm-exception.server"
import type {
  OtmAttendanceReconcileRow,
  OtmApprovalRouteRow,
  OtmEligibilityRuleRow,
  OtmPayrollExportRow,
  OtmRateRuleRow,
  OtmTypeChoiceRow,
  OrgOtmRequestRow,
} from "./otm.types.shared"
import type { HrmOtmExceptionType } from "../schemas/otm-workflow-state.shared"
import type { HrmOtmDayCategory } from "../schemas/otm.schema"
import type { OtmApprovalStage } from "./otm-approval-snapshot.shared"

const OTM_READ_PERMISSION = {
  module: "hrm" as const,
  object: "overtime" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

function formatEmployeeCell(row: OrgOtmRequestRow): string {
  const name = row.employeeFullName ?? row.employeeId
  return row.employeeNumber ? `${name} · ${row.employeeNumber}` : name
}

type OtmRequestListCopy = {
  columnsId?: string
  empty: string
  colEmployee: string
  colWorkDate: string
  colTimeRange: string
  colDuration: string
  colDayCategory: string
  colState: string
  colRequested: string
  dayCategoryLabels: Record<HrmOtmDayCategory, string>
  stateLabelFor: (state: string) => string
  formatRequestedAt: (date: Date) => string
  includeEmployeeColumn?: boolean
  approvalStageLabels?: Partial<Record<OtmApprovalStage, string>>
}

function buildOtmRequestRows(
  rows: readonly OrgOtmRequestRow[],
  copy: OtmRequestListCopy
) {
  const includeEmployee = copy.includeEmployeeColumn !== false

  return rows.map((row) => {
    const cells: Record<string, string> = {
      workDate: row.workDate,
      timeRange: `${row.startTime}–${row.endTime}`,
      duration: formatOvertimeDurationMinutes(row.durationMinutes),
      dayCategory: otmDayCategoryLabel(row.dayCategory, copy.dayCategoryLabels),
      state: copy.stateLabelFor(row.state),
      requested: copy.formatRequestedAt(row.requestedAt),
    }

    if (includeEmployee) {
      cells.employee = formatEmployeeCell(row)
    }

    return { id: row.id, cells }
  })
}

function buildOtmRequestListColumns(copy: OtmRequestListCopy) {
  const includeEmployee = copy.includeEmployeeColumn !== false

  return [
    ...(includeEmployee
      ? [{ id: "employee" as const, header: copy.colEmployee }]
      : []),
    { id: "workDate" as const, header: copy.colWorkDate },
    { id: "timeRange" as const, header: copy.colTimeRange },
    { id: "duration" as const, header: copy.colDuration },
    {
      id: "dayCategory" as const,
      header: copy.colDayCategory,
      cellKind: { kind: "badge" as const, tone: "default" as const },
    },
    {
      id: "state" as const,
      header: copy.colState,
      cellKind: { kind: "badge" as const, tone: "attention" as const },
    },
    {
      id: "requested" as const,
      header: copy.colRequested,
      cellKind: { kind: "datetime" as const },
    },
  ]
}

function buildOtmRequestListSurfaceConfiguration(
  rows: readonly OrgOtmRequestRow[],
  copy: OtmRequestListCopy,
  defaultColumnsId: string
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? defaultColumnsId

  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: OTM_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: buildOtmRequestListColumns(copy),
    rows: buildOtmRequestRows(rows, copy),
  }
}

export function buildOtmOrgRecentListSurfaceConfiguration(
  rows: readonly OrgOtmRequestRow[],
  copy: OtmRequestListCopy
): ListSurfaceRendererConfigurationInput {
  return buildOtmRequestListSurfaceConfiguration(
    rows,
    copy,
    OTM_LIST_SURFACE_IDS.orgRecent
  )
}

const MY_REQUEST_ACTIONABLE_STATES = new Set([
  "draft",
  "submitted",
  "returned",
])

export function buildOtmMyRequestsListSurfaceConfiguration(
  rows: readonly OrgOtmRequestRow[],
  copy: OtmRequestListCopy,
  options: { actionLabel: string }
): ListSurfaceRendererConfigurationInput {
  const base = buildOtmRequestListSurfaceConfiguration(
    rows,
    { ...copy, includeEmployeeColumn: false },
    OTM_LIST_SURFACE_IDS.myRequests
  )

  return {
    ...base,
    rows: rows.map((row) => {
      const cells = {
        workDate: row.workDate,
        timeRange: `${row.startTime}–${row.endTime}`,
        duration: formatOvertimeDurationMinutes(row.durationMinutes),
        dayCategory: otmDayCategoryLabel(row.dayCategory, copy.dayCategoryLabels),
        state: copy.stateLabelFor(row.state),
        requested: copy.formatRequestedAt(row.requestedAt),
      }

      const canAct = MY_REQUEST_ACTIONABLE_STATES.has(row.state)

      return {
        id: row.id,
        cells,
        trailingAction: canAct
          ? resolveListSurfaceRowTrailingAction({
              allowed: true,
              descriptor: {
                id: "erp.hrm.overtime.my_request_action",
                label: options.actionLabel,
                intent: "default",
              },
            })
          : listSurfaceRowTrailingActionHidden(),
      }
    }),
  }
}

export function buildOtmPendingListSurfaceConfiguration(
  rows: readonly OrgOtmRequestRow[],
  copy: OtmRequestListCopy,
  options: {
    canApproveAll: boolean
    currentUserId: string
    decideLabel: string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = copy.columnsId ?? OTM_LIST_SURFACE_IDS.pendingInbox
  const base = buildOtmRequestListSurfaceConfiguration(
    rows,
    { ...copy, columnsId },
    OTM_LIST_SURFACE_IDS.pendingInbox
  )

  return {
    ...base,
    rows: rows.map((row) => {
      const canDecide =
        options.canApproveAll ||
        row.currentApproverUserId === options.currentUserId

      const stateLabel = (() => {
        const base = copy.stateLabelFor(row.state)
        const stage = row.approvalStage
        const stageLabel =
          stage && copy.approvalStageLabels
            ? copy.approvalStageLabels[stage]
            : null
        return stageLabel ? `${base} · ${stageLabel}` : base
      })()

      const cells = {
        employee: formatEmployeeCell(row),
        workDate: row.workDate,
        timeRange: `${row.startTime}–${row.endTime}`,
        duration: formatOvertimeDurationMinutes(row.durationMinutes),
        dayCategory: otmDayCategoryLabel(row.dayCategory, copy.dayCategoryLabels),
        state: stateLabel,
        requested: copy.formatRequestedAt(row.requestedAt),
      }

      return {
        id: row.id,
        cells,
        trailingAction: canDecide
          ? resolveListSurfaceRowTrailingAction({
              allowed: true,
              descriptor: {
                id: "erp.hrm.overtime.decide",
                label: options.decideLabel,
                intent: "default",
              },
            })
          : listSurfaceRowTrailingActionHidden(),
      }
    }),
  }
}

export function buildOtmEligibilityRulesListSurfaceConfiguration(
  rows: readonly OtmEligibilityRuleRow[],
  copy: {
    empty: string
    colType: string
    colDepartment: string
    colGrade: string
    colEmployment: string
    colCountry: string
    colLocation: string
    colScope: string
    colException: string
    colActive: string
    yesNo: (value: boolean) => string
    anyLabel: string
    formatScope: (row: OtmEligibilityRuleRow) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = OTM_LIST_SURFACE_IDS.eligibility
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: OTM_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "type", header: copy.colType },
      { id: "department", header: copy.colDepartment },
      { id: "grade", header: copy.colGrade },
      { id: "employment", header: copy.colEmployment },
      { id: "country", header: copy.colCountry },
      { id: "location", header: copy.colLocation },
      { id: "scope", header: copy.colScope },
      { id: "exception", header: copy.colException },
      { id: "active", header: copy.colActive },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        type: row.overtimeTypeLabel,
        department: row.departmentId ?? copy.anyLabel,
        grade: row.jobGradeId ?? copy.anyLabel,
        employment: row.employmentType ?? copy.anyLabel,
        country: row.countryCode ?? copy.anyLabel,
        location: row.workLocationCode ?? copy.anyLabel,
        scope: copy.formatScope(row),
        exception: copy.yesNo(row.allowException),
        active: copy.yesNo(row.isActive),
      },
    })),
  }
}

function formatAmountCentsLabel(
  cents: number | null,
  anyLabel: string
): string {
  if (cents == null) return anyLabel
  return (cents / 100).toFixed(2)
}

export function buildOtmApprovalRoutesListSurfaceConfiguration(
  rows: readonly OtmApprovalRouteRow[],
  copy: {
    empty: string
    colPriority: string
    colLabel: string
    colDepartment: string
    colCostCenter: string
    colLocation: string
    colGrade: string
    colAmount: string
    colException: string
    colApprover: string
    colActive: string
    anyLabel: string
    yesNo: (value: boolean) => string
    formatApproverKind: (kind: string) => string
    formatExceptionFlags: (row: OtmApprovalRouteRow) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = OTM_LIST_SURFACE_IDS.approvalRoutes
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: OTM_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "priority", header: copy.colPriority },
      { id: "label", header: copy.colLabel },
      { id: "department", header: copy.colDepartment },
      { id: "costCenter", header: copy.colCostCenter },
      { id: "location", header: copy.colLocation },
      { id: "grade", header: copy.colGrade },
      { id: "amount", header: copy.colAmount },
      { id: "exception", header: copy.colException },
      { id: "approver", header: copy.colApprover },
      { id: "active", header: copy.colActive },
    ],
    rows: rows.map((row) => {
      const amountParts: string[] = []
      if (row.minAmountCents != null) {
        amountParts.push(
          `≥ ${formatAmountCentsLabel(row.minAmountCents, copy.anyLabel)}`
        )
      }
      if (row.maxAmountCents != null) {
        amountParts.push(
          `≤ ${formatAmountCentsLabel(row.maxAmountCents, copy.anyLabel)}`
        )
      }
      return {
        id: row.id,
        cells: {
          priority: String(row.priority),
          label: row.label ?? copy.anyLabel,
          department: row.departmentId ?? copy.anyLabel,
          costCenter: row.costCenterCode ?? copy.anyLabel,
          location: row.workLocationCode ?? copy.anyLabel,
          grade: row.jobGradeId ?? copy.anyLabel,
          amount:
            amountParts.length > 0 ? amountParts.join(" ") : copy.anyLabel,
          exception: copy.formatExceptionFlags(row),
          approver: copy.formatApproverKind(row.approverKind),
          active: copy.yesNo(row.isActive),
        },
      }
    }),
  }
}

export function buildOtmTypesListSurfaceConfiguration(
  rows: readonly OtmTypeChoiceRow[],
  copy: {
    empty: string
    colCode: string
    colLabel: string
    colDayCategory: string
    dayCategoryLabelFor: (category: string) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = OTM_LIST_SURFACE_IDS.types
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: OTM_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "label", header: copy.colLabel },
      {
        id: "dayCategory",
        header: copy.colDayCategory,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        label: row.label,
        dayCategory: copy.dayCategoryLabelFor(row.dayCategory),
      },
    })),
  }
}

export function buildOtmRateRulesListSurfaceConfiguration(
  rows: readonly OtmRateRuleRow[],
  copy: {
    empty: string
    colType: string
    colMultiplier: string
    colCountry: string
    colWorker: string
    colEarning: string
    colEffective: string
    anyLabel: string
    formatEffective: (row: OtmRateRuleRow) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = OTM_LIST_SURFACE_IDS.rateRules
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: OTM_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "type", header: copy.colType },
      { id: "multiplier", header: copy.colMultiplier },
      { id: "country", header: copy.colCountry },
      { id: "worker", header: copy.colWorker },
      { id: "earning", header: copy.colEarning },
      { id: "effective", header: copy.colEffective },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        type: row.overtimeTypeLabel,
        multiplier: formatOtmMultiplierLabel(row.multiplierHundredths),
        country: row.countryCode ?? copy.anyLabel,
        worker: row.workerCategory ?? copy.anyLabel,
        earning: row.earningCode ?? copy.anyLabel,
        effective: copy.formatEffective(row),
      },
    })),
  }
}

export function buildOtmPayrollReadyListSurfaceConfiguration(
  rows: readonly OtmPayrollExportRow[],
  copy: {
    empty: string
    colEmployee: string
    colWorkDate: string
    colPayable: string
    colMultiplier: string
    colEarning: string
    colState: string
    stateLabelFor: (state: string) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = OTM_LIST_SURFACE_IDS.payrollReady
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: OTM_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "requestId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "workDate", header: copy.colWorkDate },
      { id: "payable", header: copy.colPayable },
      { id: "multiplier", header: copy.colMultiplier },
      { id: "earning", header: copy.colEarning },
      { id: "state", header: copy.colState },
    ],
    rows: rows.map((row) => ({
      id: row.requestId,
      cells: {
        employee: row.employeeNumber
          ? `${row.employeeFullName ?? row.employeeId} · ${row.employeeNumber}`
          : (row.employeeFullName ?? row.employeeId),
        workDate: row.workDate,
        payable: formatOvertimeDurationMinutes(row.payableMinutes),
        multiplier: formatOtmMultiplierLabel(row.multiplierHundredths),
        earning: row.earningCode,
        state: copy.stateLabelFor(row.state),
      },
    })),
  }
}

export function buildOtmApprovedPayrollMarkListSurfaceConfiguration(
  rows: readonly OrgOtmRequestRow[],
  copy: OtmRequestListCopy,
  options: { markPayrollLabel: string }
): ListSurfaceRendererConfigurationInput {
  const columnsId = OTM_LIST_SURFACE_IDS.approvedPayroll
  const base = buildOtmRequestListSurfaceConfiguration(
    rows,
    { ...copy, columnsId, includeEmployeeColumn: true },
    columnsId
  )

  return {
    ...base,
    rows: rows.map((row) => {
      const cells: Record<string, string> = {
        employee: formatEmployeeCell(row),
        workDate: row.workDate,
        timeRange: `${row.startTime}–${row.endTime}`,
        duration: formatOvertimeDurationMinutes(row.durationMinutes),
        dayCategory: otmDayCategoryLabel(row.dayCategory, copy.dayCategoryLabels),
        state: copy.stateLabelFor(row.state),
        requested: copy.formatRequestedAt(row.requestedAt),
      }

      return {
        id: row.id,
        cells,
        trailingAction: resolveListSurfaceRowTrailingAction({
          allowed: true,
          descriptor: {
            id: "erp.hrm.overtime.mark_payroll_ready",
            label: options.markPayrollLabel,
            intent: "default",
          },
        }),
      }
    }),
  }
}

export function buildOtmAttendanceReconcileListSurfaceConfiguration(
  rows: readonly OtmAttendanceReconcileRow[],
  copy: {
    empty: string
    colEmployee: string
    colWorkDate: string
    colPayable: string
    colAttendance: string
    colVariance: string
    formatMinutes: (minutes: number | null) => string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = OTM_LIST_SURFACE_IDS.attendanceReconcile
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: OTM_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "requestId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "workDate", header: copy.colWorkDate },
      { id: "payable", header: copy.colPayable },
      { id: "attendance", header: copy.colAttendance },
      { id: "variance", header: copy.colVariance },
    ],
    rows: rows.map((row) => ({
      id: row.requestId,
      cells: {
        employee: row.employeeFullName ?? "—",
        workDate: row.workDate,
        payable: copy.formatMinutes(row.payableMinutes),
        attendance: copy.formatMinutes(row.attendanceMinutes),
        variance: copy.formatMinutes(row.varianceMinutes),
      },
    })),
  }
}

export function buildOtmExceptionInboxListSurfaceConfiguration(
  rows: readonly OtmExceptionInboxRow[],
  copy: {
    empty: string
    colEmployee: string
    colWorkDate: string
    colType: string
    colJustification: string
    colTimeRange: string
    colDuration: string
    colActions: string
    exceptionTypeLabel: (type: HrmOtmExceptionType) => string
    formatDuration: (minutes: number) => string
    approveLabel: string
    rejectLabel: string
  }
): ListSurfaceRendererConfigurationInput {
  const columnsId = OTM_LIST_SURFACE_IDS.exceptionInbox
  return {
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: {
      module: "hrm",
      object: "overtime",
      function: "update",
    },
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "workDate", header: copy.colWorkDate },
      { id: "type", header: copy.colType },
      { id: "justification", header: copy.colJustification },
      { id: "timeRange", header: copy.colTimeRange },
      { id: "duration", header: copy.colDuration },
      { id: "actions", header: copy.colActions },
    ],
    rows: rows.map((row) => {
      const name = row.employeeFullName ?? row.employeeId
      const employee =
        row.employeeNumber != null ? `${name} · ${row.employeeNumber}` : name
      return {
        id: row.id,
        cells: {
          employee,
          workDate: row.workDate,
          type: copy.exceptionTypeLabel(row.exceptionType),
          justification: row.justification ?? "—",
          timeRange: `${row.startTime}–${row.endTime}`,
          duration: copy.formatDuration(row.durationMinutes),
          actions: "",
        },
        trailingAction: resolveListSurfaceRowTrailingAction({
          allowed: true,
          descriptor: {
            id: "erp.hrm.overtime.exception_decide",
            label: `${copy.approveLabel} / ${copy.rejectLabel}`,
            intent: "default",
          },
        }),
      }
    }),
  }
}
