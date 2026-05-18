import "server-only"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"
import { employeePortalPath } from "#lib/portal"

import type { BenefitEnrollmentListRow } from "../../../payroll-compensation/benefits-administration/data/benefit.queries.server"
import {
  mapClaimRowToListSurfaceRow,
  type ClaimListStateLabels,
} from "../../../payroll-compensation/expenses-reimbursement/data/claim-list-surface-rows.shared"
import type { ClaimEvidenceRow, ClaimRow } from "../../../payroll-compensation/expenses-reimbursement/data/claim.queries.server"
import type { SalaryAdvanceListRow } from "../../../payroll-compensation/payroll-processing/data/salary-advance.queries.server"
import type { KpiGoalRow } from "../../../talent-management/competency-skills-framework/data/kpi-goal.queries.server"
import type { HrmTrainingAssignmentRow } from "../../../talent-management/training-development/data/training.types.shared"
import type { EmployeeVisibleDocumentSummary } from "../../documents-management/data/hrm-document.queries.server"
import type { EmployeePortalOpenRequestRow } from "./employee-portal-requests.queries.server"

import { EMPLOYEE_PORTAL_LIST_SURFACE_IDS } from "./employee-portal-surface-metadata.shared"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

type PortalClaimsListCopy = {
  columnsId?: string
  empty: string
  colClaimDate: string
  colAmount: string
  colState: string
  colEvidence: string
  evidenceCountLabel: (count: number) => string
  stateLabels: ClaimListStateLabels
}

export function buildEmployeePortalClaimsListSurfaceConfiguration(
  rows: readonly ClaimRow[],
  claimDetailHref: (claimId: string) => string,
  copy: PortalClaimsListCopy
): ListSurfaceRendererConfiguration {
  const columnsId = copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.claims
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      {
        id: "claimDate",
        header: copy.colClaimDate,
        cellKind: { kind: "link" },
      },
      { id: "amount", header: copy.colAmount },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "evidence", header: copy.colEvidence },
    ],
    rows: rows.map((row) =>
      mapClaimRowToListSurfaceRow({
        row,
        rowHref: claimDetailHref(row.id),
        linkColumnId: "claimDate",
        stateLabels: copy.stateLabels,
        formatEvidenceCount: copy.evidenceCountLabel,
        includeEmployee: false,
      })
    ),
  }
}

type PortalClaimEvidenceListCopy = {
  columnsId?: string
  empty: string
  colTitle: string
  colType: string
}

export function buildEmployeePortalClaimEvidenceListSurfaceConfiguration(
  rows: readonly ClaimEvidenceRow[],
  copy: PortalClaimEvidenceListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.claimEvidence
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      {
        id: "type",
        header: copy.colType,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        title: row.documentTitle,
        type: row.evidenceType,
      },
    })),
  }
}

type PortalDocumentsListCopy = {
  columnsId?: string
  empty: string
  colTitle: string
  colType: string
}

export function buildEmployeePortalDocumentsListSurfaceConfiguration(
  rows: readonly EmployeeVisibleDocumentSummary[],
  copy: PortalDocumentsListCopy
): ListSurfaceRendererConfiguration {
  const columnsId = copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.documents
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      {
        id: "type",
        header: copy.colType,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        title: row.title,
        type: row.documentType,
      },
    })),
  }
}

type PortalOpenRequestsListCopy = {
  columnsId?: string
  empty: string
  colType: string
  colDetails: string
  colStatus: string
  colSubmitted: string
  kindLabelFor: (kind: EmployeePortalOpenRequestRow["kind"]) => string
}

export function buildEmployeePortalOpenRequestsListSurfaceConfiguration(
  rows: readonly EmployeePortalOpenRequestRow[],
  copy: PortalOpenRequestsListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.openRequests
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      {
        id: "type",
        header: copy.colType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "details", header: copy.colDetails },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "submitted",
        header: copy.colSubmitted,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => ({
      id: `${row.kind}-${row.id}`,
      cells: {
        type: copy.kindLabelFor(row.kind),
        details: row.label,
        status: row.status,
        submitted: row.submittedAt.toISOString(),
      },
    })),
  }
}

type PortalAdvanceListCopy = {
  columnsId?: string
  empty: string
  colAmount: string
  colState: string
  colRequested: string
  colReason: string
  stateLabelFor: (state: string) => string
}

export function buildEmployeePortalAdvanceListSurfaceConfiguration(
  rows: readonly SalaryAdvanceListRow[],
  copy: PortalAdvanceListCopy
): ListSurfaceRendererConfiguration {
  const columnsId = copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.advances
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "amount", header: copy.colAmount },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "default" },
      },
      {
        id: "requested",
        header: copy.colRequested,
        cellKind: { kind: "date" },
      },
      { id: "reason", header: copy.colReason },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        amount: `${row.amount} ${row.currency}`,
        state: copy.stateLabelFor(row.state),
        requested: row.requestedAt.toISOString().slice(0, 10),
        reason: row.reason ?? "—",
      },
    })),
  }
}

export type PortalAdvanceInstallmentDisplayRow = {
  readonly id: string
  readonly sequence: number
  readonly dueAfterPeriodEndIso: string
  readonly plannedAmount: string
  readonly currency: string
  readonly state: string
}

type PortalAdvanceInstallmentListCopy = {
  columnsId?: string
  empty: string
  colSequence: string
  colPeriodEnd: string
  colAmount: string
  colState: string
  stateLabelFor: (state: string) => string
}

export function buildEmployeePortalAdvanceInstallmentListSurfaceConfiguration(
  rows: readonly PortalAdvanceInstallmentDisplayRow[],
  copy: PortalAdvanceInstallmentListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.advanceInstallments
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "sequence", header: copy.colSequence, align: "end" },
      { id: "periodEnd", header: copy.colPeriodEnd, cellKind: { kind: "date" } },
      { id: "amount", header: copy.colAmount, align: "end" },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        sequence: String(row.sequence),
        periodEnd: row.dueAfterPeriodEndIso.slice(0, 10),
        amount: `${row.plannedAmount} ${row.currency}`,
        state: copy.stateLabelFor(row.state),
      },
    })),
  }
}

type PortalPerformanceGoalsListCopy = {
  columnsId?: string
  empty: string
  colTitle: string
  colStatus: string
  colDue: string
  colProgress: string
  formatDue: (dueDate: Date | string | null) => string
}

export function buildEmployeePortalPerformanceGoalsListSurfaceConfiguration(
  rows: readonly KpiGoalRow[],
  copy: PortalPerformanceGoalsListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.performanceGoals
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "due", header: copy.colDue, cellKind: { kind: "date" } },
      { id: "progress", header: copy.colProgress, align: "end" },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        title: row.title,
        status: row.status,
        due: copy.formatDue(row.dueDate),
        progress: `${row.percentComplete ?? 0}%`,
      },
    })),
  }
}

type PortalTrainingDueListCopy = {
  columnsId?: string
  empty: string
  colCourse: string
  colDue: string
  colState: string
  formatDue: (value: Date | null) => string
}

export function buildEmployeePortalTrainingDueListSurfaceConfiguration(
  rows: readonly HrmTrainingAssignmentRow[],
  copy: PortalTrainingDueListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.trainingDue
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "course", header: copy.colCourse },
      { id: "due", header: copy.colDue, cellKind: { kind: "date" } },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        course: row.courseName,
        due: row.dueAt ? copy.formatDue(row.dueAt) : "—",
        state: row.state,
      },
    })),
  }
}

type PortalBenefitEnrollmentListCopy = {
  columnsId?: string
  empty: string
  colPlan: string
  colState: string
  colCoverage: string
  colEffective: string
}

function formatBenefitEffectiveDate(
  value: Date | string | null | undefined
): string {
  if (!value) return "—"
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return String(value).slice(0, 10)
}

export function buildEmployeePortalBenefitEnrollmentListSurfaceConfiguration(
  rows: readonly BenefitEnrollmentListRow[],
  copy: PortalBenefitEnrollmentListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? EMPLOYEE_PORTAL_LIST_SURFACE_IDS.benefitEnrollments
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "enrollmentId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "plan", header: copy.colPlan },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "coverage", header: copy.colCoverage },
      { id: "effective", header: copy.colEffective, cellKind: { kind: "date" } },
    ],
    rows: rows.map((row) => ({
      id: row.enrollmentId,
      cells: {
        plan: row.benefitName,
        state: row.state,
        coverage: row.coverageLevel ?? "—",
        effective: formatBenefitEffectiveDate(row.effectiveFrom),
      },
    })),
  }
}

export function employeePortalPerformanceGoalHref(
  portalSlug: string,
  goalId: string
): string {
  return `${employeePortalPath(portalSlug, "performance")}/${goalId}`
}
