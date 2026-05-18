import "server-only"

import {
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import type { ComplianceDashboardRow } from "./compliance-dashboard.shared"
import type { ComplianceExceptionListRow } from "./compliance-exception.queries.server"
import type { ComplianceFilingListRow } from "./compliance-filing.queries.server"
import type { ComplianceEvidenceRow } from "./compliance.queries.server"
import type { ComplianceHealthSampleRow } from "./compliance-operational-health.queries.server"
import type { ComplianceHealthAttentionBucket } from "./compliance-operational-health.shared"
const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

const COMPLIANCE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "compliance" as const,
  function: "read" as const,
}

export type ComplianceListTrailingContext = {
  showActionsColumn: boolean
  canUpdate: boolean
}

type ComplianceExceptionsListCopy = {
  empty: string
  colTitle: string
  colArea: string
  colSeverity: string
  colStatus: string
  colSubject: string
}

export function buildComplianceExceptionsListSurfaceConfiguration(
  rows: readonly ComplianceExceptionListRow[],
  copy: ComplianceExceptionsListCopy,
  context?: ComplianceListTrailingContext
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: COMPLIANCE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-compliance-exceptions" },
      columnsId: "hrm-compliance-exceptions",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "area",
        header: copy.colArea,
        cellKind: { kind: "badge", tone: "default" },
      },
      {
        id: "severity",
        header: copy.colSeverity,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "subject", header: copy.colSubject },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        title: row.title,
        status: row.status,
        area: row.complianceArea,
        severity: row.severity,
        subject: row.legalName ?? copy.colSubject,
      },
      trailingAction:
        context?.showActionsColumn && context.canUpdate
          ? resolveListSurfaceRowTrailingAction({
              visible: true,
              allowed: true,
            })
          : undefined,
    })),
  }
}

type ComplianceFilingsListCopy = {
  empty: string
  colTitle: string
  colCategory: string
  colStatus: string
  colDue: string
  colScope: string
  formatDueDate: (date: Date) => string
}

export function buildComplianceFilingsListSurfaceConfiguration(
  rows: readonly ComplianceFilingListRow[],
  copy: ComplianceFilingsListCopy,
  context?: ComplianceListTrailingContext
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: COMPLIANCE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-compliance-filings" },
      columnsId: "hrm-compliance-filings",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "category",
        header: copy.colCategory,
        cellKind: { kind: "badge", tone: "default" },
      },
      {
        id: "due",
        header: copy.colDue,
        cellKind: { kind: "date" },
      },
      { id: "scope", header: copy.colScope },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        title: row.title,
        status: row.derivedStatus,
        category: row.filingCategory,
        due: copy.formatDueDate(row.dueDate),
        scope: [
          row.countryCode ?? "Global",
          row.legalEntityCode ?? null,
        ]
          .filter(Boolean)
          .join(" · "),
      },
      trailingAction:
        context?.showActionsColumn && context.canUpdate
          ? resolveListSurfaceRowTrailingAction({
              visible: true,
              allowed: true,
            })
          : undefined,
    })),
  }
}

type ComplianceEmployeeStatusListCopy = {
  empty: string
  colEmployee: string
  colStatus: string
  colOpen: string
  colScope: string
  colSignals: string
}

type ComplianceEvidenceRegisterListCopy = {
  empty: string
  colPack: string
  colState: string
  colVersion: string
  colGenerated: string
  packLabelFor: (packType: string) => string
  formatGenerated: (value: Date) => string
}

export function buildComplianceEvidenceRegisterListSurfaceConfiguration(
  rows: readonly ComplianceEvidenceRow[],
  copy: ComplianceEvidenceRegisterListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: COMPLIANCE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-compliance-evidence-register" },
      columnsId: "hrm-compliance-evidence-register",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "pack", header: copy.colPack },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "version", header: copy.colVersion },
      {
        id: "generated",
        header: copy.colGenerated,
        cellKind: { kind: "date" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        pack: copy.packLabelFor(row.packType),
        state: row.submissionState,
        version: row.rulePackVersion,
        generated: copy.formatGenerated(row.generatedAt),
      },
      trailingAction: resolveListSurfaceRowTrailingAction({
        visible: true,
        allowed: true,
      }),
    })),
  }
}

type ComplianceHealthSamplesListCopy = {
  empty: string
  colPack: string
  colPeriod: string
  colAge: string
  colTier: string
  packLabelFor: (packType: string) => string
  formatPeriod: (row: ComplianceHealthSampleRow) => string
  ageLabelFor: (ageDays: number) => string
  tierLabelFor: (
    bucket: ComplianceHealthAttentionBucket,
    row: ComplianceHealthSampleRow
  ) => string
}

export function buildComplianceHealthSamplesListSurfaceConfiguration(
  bucket: ComplianceHealthAttentionBucket,
  rows: readonly ComplianceHealthSampleRow[],
  copy: ComplianceHealthSamplesListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: COMPLIANCE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: `hrm-compliance-health-${bucket}` },
      columnsId: `hrm-compliance-health-${bucket}`,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "pack", header: copy.colPack },
      { id: "period", header: copy.colPeriod },
      { id: "age", header: copy.colAge },
      {
        id: "tier",
        header: copy.colTier,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        pack: copy.packLabelFor(row.packType),
        period: copy.formatPeriod(row),
        age: copy.ageLabelFor(row.ageDays),
        tier: copy.tierLabelFor(bucket, row),
      },
      trailingAction: resolveListSurfaceRowTrailingAction({
        visible: true,
        allowed: rows.length > 0,
      }),
    })),
  }
}

export function buildComplianceEmployeeStatusListSurfaceConfiguration(
  rows: readonly ComplianceDashboardRow[],
  copy: ComplianceEmployeeStatusListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: COMPLIANCE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-compliance-employee-status" },
      columnsId: "hrm-compliance-employee-status",
      rowKey: "employeeId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "open",
        header: copy.colOpen,
        align: "end",
      },
      { id: "scope", header: copy.colScope },
      { id: "signals", header: copy.colSignals },
    ],
    rows: rows.map((row) => ({
      id: row.employeeId,
      cells: {
        employee: `${row.employeeNumber} · ${row.legalName}`,
        status: row.overallStatus,
        open: String(row.openExceptionCount),
        scope: [
          row.legalEntityCode ?? "No entity",
          row.workLocationCode ?? "No location",
          row.employmentType ?? "No employment type",
          row.workerCategory ?? "No worker category",
        ].join(" · "),
        signals: `docs ${row.documentMissing}/${row.documentExpired} · training ${row.trainingOverdue} · policy ${row.missingAcknowledgementCount}`,
      },
    })),
  }
}
