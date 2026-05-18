import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type {
  BenefitCostByLegalEntityRow,
  BenefitEnrollmentByPlanRow,
} from "./benefit-reporting.shared"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type BenefitReportsByPlanListCopy = {
  empty: string
  colPlan: string
  colCounts: string
  planCountsLabel: (active: number, pending: number) => string
}

export function buildBenefitReportsByPlanListSurfaceConfiguration(
  rows: readonly BenefitEnrollmentByPlanRow[],
  copy: BenefitReportsByPlanListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-benefit-reports-by-plan" },
      columnsId: "hrm-benefit-reports-by-plan",
      rowKey: "benefitId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "plan", header: copy.colPlan },
      { id: "counts", header: copy.colCounts },
    ],
    rows: rows.map((row) => ({
      id: row.benefitId,
      cells: {
        plan: `${row.benefitName} (${row.benefitCode})`,
        counts: copy.planCountsLabel(row.activeCount, row.pendingCount),
      },
    })),
  }
}

type BenefitReportsByEntityListCopy = {
  empty: string
  colEntity: string
  colTotals: string
  entityTotalsLabel: (
    enrollmentCount: number,
    employeeTotal: string,
    employerTotal: string
  ) => string
}

export function buildBenefitReportsByEntityListSurfaceConfiguration(
  rows: readonly BenefitCostByLegalEntityRow[],
  copy: BenefitReportsByEntityListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-benefit-reports-by-entity" },
      columnsId: "hrm-benefit-reports-by-entity",
      rowKey: "legalEntityCode",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "entity", header: copy.colEntity },
      { id: "totals", header: copy.colTotals },
    ],
    rows: rows.map((row) => ({
      id: row.legalEntityCode,
      cells: {
        entity: row.legalEntityCode,
        totals: copy.entityTotalsLabel(
          row.enrollmentCount,
          row.employeeContributionTotal,
          row.employerContributionTotal
        ),
      },
    })),
  }
}
