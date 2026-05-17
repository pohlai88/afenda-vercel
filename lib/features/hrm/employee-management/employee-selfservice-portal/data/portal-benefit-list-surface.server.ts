import "server-only"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"

import { PORTAL_BENEFIT_LIST_SURFACE_IDS } from "./portal-benefit-surface-metadata.shared"

export type PortalBenefitEnrollmentDisplayRow = {
  enrollmentId: string
  plan: string
  state: string
  coverage: string
  effective: string
}

export type PortalBenefitLifeEventDisplayRow = {
  id: string
  eventType: string
  eventDate: string
  verificationStatus: string
}

export type PortalBenefitDependentDisplayRow = {
  id: string
  legalName: string
  relationship: string
  taxDependent: string
}

type PortalEnrollmentListCopy = {
  columnsId?: string
  empty: string
  colPlan: string
  colState: string
  colCoverage: string
  colEffective: string
}

type PortalLifeEventListCopy = {
  columnsId?: string
  empty: string
  colType: string
  colDate: string
  colStatus: string
}

type PortalDependentListCopy = {
  columnsId?: string
  empty: string
  colName: string
  colRelationship: string
  colTax: string
}

function listSurfaceHeader(columnsId: string) {
  return { title: columnsId }
}

export function buildPortalBenefitEnrollmentListSurfaceConfiguration(
  rows: readonly PortalBenefitEnrollmentDisplayRow[],
  copy: PortalEnrollmentListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? PORTAL_BENEFIT_LIST_SURFACE_IDS.coverage
  return {
    dataNature: "table",
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
        plan: row.plan,
        state: row.state,
        coverage: row.coverage,
        effective: row.effective,
      },
    })),
  }
}

export function buildPortalBenefitLifeEventListSurfaceConfiguration(
  rows: readonly PortalBenefitLifeEventDisplayRow[],
  copy: PortalLifeEventListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? PORTAL_BENEFIT_LIST_SURFACE_IDS.lifeEvents
  return {
    dataNature: "table",
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "eventType", header: copy.colType },
      { id: "eventDate", header: copy.colDate, cellKind: { kind: "date" } },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        eventType: row.eventType,
        eventDate: row.eventDate,
        status: row.verificationStatus,
      },
    })),
  }
}

export function buildPortalBenefitDependentListSurfaceConfiguration(
  rows: readonly PortalBenefitDependentDisplayRow[],
  copy: PortalDependentListCopy
): ListSurfaceRendererConfiguration {
  const columnsId =
    copy.columnsId ?? PORTAL_BENEFIT_LIST_SURFACE_IDS.dependents
  return {
    dataNature: "table",
    surface: {
      header: listSurfaceHeader(columnsId),
      columnsId,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "relationship", header: copy.colRelationship },
      { id: "tax", header: copy.colTax },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        name: row.legalName,
        relationship: row.relationship,
        tax: row.taxDependent,
      },
    })),
  }
}
