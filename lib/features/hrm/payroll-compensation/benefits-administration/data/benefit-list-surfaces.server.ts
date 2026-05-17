import "server-only"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"

import { BENEFIT_LIST_SURFACE_IDS } from "./benefit-surface-metadata.shared"
import type {
  BenefitEnrollmentListRow,
  BenefitOpenEnrollmentRow,
  BenefitPlanRow,
} from "./benefit-model.shared"
import type { BenefitProviderRow } from "./benefit-provider.queries.server"

type ListCopy = {
  title: string
  description: string
  empty: string
}

export function buildBenefitPlansListSurfaceConfiguration(
  rows: BenefitPlanRow[],
  copy: ListCopy & {
    colCode: string
    colName: string
    colCategory: string
    colStatus: string
    activeLabel: string
    inactiveLabel: string
  }
): ListSurfaceRendererConfiguration {
  return {
    dataNature: "table",
    surface: {
      header: {
        eyebrow: copy.title,
        title: copy.title,
        description: copy.description,
      },
      columnsId: BENEFIT_LIST_SURFACE_IDS.plans,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "category", header: copy.colCategory },
      { id: "status", header: copy.colStatus },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        name: row.name,
        category: row.benefitCategory ?? row.benefitKind,
        status: row.isActive ? copy.activeLabel : copy.inactiveLabel,
      },
    })),
  }
}

export function buildBenefitEnrollmentsListSurfaceConfiguration(
  rows: BenefitEnrollmentListRow[],
  copy: ListCopy & {
    colEmployee: string
    colPlan: string
    colState: string
    colCoverage: string
  }
): ListSurfaceRendererConfiguration {
  return {
    dataNature: "table",
    surface: {
      header: {
        eyebrow: copy.title,
        title: copy.title,
        description: copy.description,
      },
      columnsId: BENEFIT_LIST_SURFACE_IDS.enrollments,
      rowKey: "enrollmentId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "plan", header: copy.colPlan },
      { id: "state", header: copy.colState },
      { id: "coverage", header: copy.colCoverage },
    ],
    rows: rows.map((row) => ({
      id: row.enrollmentId,
      cells: {
        employee: row.employeeLegalName,
        plan: row.benefitName,
        state: row.state,
        coverage: row.coverageLevel ?? "—",
      },
    })),
  }
}

export function buildBenefitOpenEnrollmentListSurfaceConfiguration(
  rows: BenefitOpenEnrollmentRow[],
  copy: ListCopy & {
    colName: string
    colPeriod: string
    colStatus: string
    activeLabel: string
    closedLabel: string
  }
): ListSurfaceRendererConfiguration {
  return {
    dataNature: "table",
    surface: {
      header: {
        eyebrow: copy.title,
        title: copy.title,
        description: copy.description,
      },
      columnsId: BENEFIT_LIST_SURFACE_IDS.openEnrollment,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "period", header: copy.colPeriod },
      { id: "status", header: copy.colStatus },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        name: row.name,
        period: `${row.startsOn.toISOString().slice(0, 10)} – ${row.endsOn.toISOString().slice(0, 10)}`,
        status: row.isActive ? copy.activeLabel : copy.closedLabel,
      },
    })),
  }
}

export function buildBenefitProvidersListSurfaceConfiguration(
  rows: BenefitProviderRow[],
  copy: ListCopy & {
    colCode: string
    colName: string
    colCountries: string
    colStatus: string
    activeLabel: string
    inactiveLabel: string
  }
): ListSurfaceRendererConfiguration {
  return {
    dataNature: "table",
    surface: {
      header: {
        eyebrow: copy.title,
        title: copy.title,
        description: copy.description,
      },
      columnsId: BENEFIT_LIST_SURFACE_IDS.providers,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "countries", header: copy.colCountries },
      { id: "status", header: copy.colStatus },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        name: row.name,
        countries:
          row.countryCodes.length > 0 ? row.countryCodes.join(", ") : "—",
        status: row.isActive ? copy.activeLabel : copy.inactiveLabel,
      },
    })),
  }
}
