import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import {
  formatBenchmarkMoney,
  formatBenchmarkRatio,
  salaryBenchmarkMarketPositionLabel,
} from "./salary-benchmarking-display.shared"
import type {
  SalaryBenchmarkAnalysisResult,
  SalaryBenchmarkPayEquityGroup,
} from "./salary-benchmarking-engine.shared"
import type {
  SalaryBenchmarkMapping,
  SalaryBenchmarkRow,
  SalaryBenchmarkSurvey,
} from "../schemas/salary-benchmarking.schema"

const SALARY_BENCHMARKING_READ_PERMISSION = {
  module: "hrm" as const,
  object: "salary_benchmarking" as const,
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

export function buildSalaryBenchmarkSurveyListSurfaceConfiguration(
  rows: readonly SalaryBenchmarkSurvey[],
  copy: {
    readonly empty: string
    readonly colProvider: string
    readonly colYear: string
    readonly colIndustry: string
    readonly colCountry: string
    readonly colCurrency: string
    readonly colVersion: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: SALARY_BENCHMARKING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-salary-benchmark-surveys" },
      columnsId: "hrm-salary-benchmark-surveys",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "provider", header: copy.colProvider },
      { id: "year", header: copy.colYear },
      { id: "industry", header: copy.colIndustry },
      { id: "country", header: copy.colCountry },
      { id: "currency", header: copy.colCurrency },
      { id: "version", header: copy.colVersion },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        provider: row.provider,
        year: String(row.surveyYear),
        industry: row.industry ?? "-",
        country: row.countryCode,
        currency: row.currency,
        version: row.sourceVersion,
      },
    })),
  }
}

export function buildSalaryBenchmarkMarketDataListSurfaceConfiguration(
  rows: readonly SalaryBenchmarkRow[],
  copy: {
    readonly empty: string
    readonly colJob: string
    readonly colFamily: string
    readonly colLevel: string
    readonly colMedian: string
    readonly colP25: string
    readonly colP75: string
    readonly colSample: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: SALARY_BENCHMARKING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-salary-benchmark-market-data" },
      columnsId: "hrm-salary-benchmark-market-data",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "job", header: copy.colJob },
      { id: "family", header: copy.colFamily },
      { id: "level", header: copy.colLevel },
      { id: "median", header: copy.colMedian },
      { id: "p25", header: copy.colP25 },
      { id: "p75", header: copy.colP75 },
      { id: "sample", header: copy.colSample },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        job: `${row.benchmarkJobTitle} (${row.benchmarkJobCode})`,
        family: row.jobFamily,
        level: row.benchmarkLevel,
        median: formatBenchmarkMoney(row.median ?? row.p50, row.currency),
        p25: formatBenchmarkMoney(row.p25, row.currency),
        p75: formatBenchmarkMoney(row.p75, row.currency),
        sample: row.sampleSize ? String(row.sampleSize) : "-",
      },
    })),
  }
}

export function buildSalaryBenchmarkMappingListSurfaceConfiguration(
  rows: readonly SalaryBenchmarkMapping[],
  copy: {
    readonly empty: string
    readonly colJob: string
    readonly colFamily: string
    readonly colGrade: string
    readonly colCountry: string
    readonly colVersion: string
    readonly colState: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: SALARY_BENCHMARKING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-salary-benchmark-mappings" },
      columnsId: "hrm-salary-benchmark-mappings",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "job", header: copy.colJob },
      { id: "family", header: copy.colFamily },
      { id: "grade", header: copy.colGrade },
      { id: "country", header: copy.colCountry },
      { id: "version", header: copy.colVersion },
      badgeColumn("state", copy.colState),
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        job: row.internalJobTitle,
        family: row.internalJobFamily,
        grade: row.internalGrade,
        country: row.countryCode,
        version: row.sourceVersion,
        state: row.state.replaceAll("_", " "),
      },
    })),
  }
}

export function buildSalaryBenchmarkAnalysisListSurfaceConfiguration(
  rows: readonly SalaryBenchmarkAnalysisResult[],
  copy: {
    readonly empty: string
    readonly colEmployee: string
    readonly colScope: string
    readonly colCompared: string
    readonly colMarketRatio: string
    readonly colCompaRatio: string
    readonly colPosition: string
    readonly colRecommendation: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: SALARY_BENCHMARKING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-salary-benchmark-analysis" },
      columnsId: "hrm-salary-benchmark-analysis",
      rowKey: "employeeId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "scope", header: copy.colScope },
      { id: "compared", header: copy.colCompared },
      { id: "marketRatio", header: copy.colMarketRatio },
      { id: "compaRatio", header: copy.colCompaRatio },
      badgeColumn("position", copy.colPosition),
      { id: "recommendation", header: copy.colRecommendation },
    ],
    rows: rows.map((row) => ({
      id: row.employeeId,
      cells: {
        employee: row.employeeName,
        scope: row.compensationScope.replaceAll("_", " "),
        compared: formatBenchmarkMoney(row.comparedAmount, row.currency),
        marketRatio: formatBenchmarkRatio(row.marketRatio),
        compaRatio: formatBenchmarkRatio(row.compaRatio),
        position: salaryBenchmarkMarketPositionLabel(row.marketPosition),
        recommendation:
          row.recommendedAdjustmentAmount > 0
            ? formatBenchmarkMoney(
                row.recommendedAdjustmentAmount,
                row.currency
              )
            : "-",
      },
    })),
  }
}

export function buildSalaryBenchmarkPayEquityListSurfaceConfiguration(
  rows: readonly SalaryBenchmarkPayEquityGroup[],
  copy: {
    readonly empty: string
    readonly colGroup: string
    readonly colEmployees: string
    readonly colAverage: string
    readonly colRange: string
    readonly colGap: string
    readonly colGapRatio: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: SALARY_BENCHMARKING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-salary-benchmark-pay-equity" },
      columnsId: "hrm-salary-benchmark-pay-equity",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "group", header: copy.colGroup },
      { id: "employees", header: copy.colEmployees },
      { id: "average", header: copy.colAverage },
      { id: "range", header: copy.colRange },
      { id: "gap", header: copy.colGap },
      { id: "gapRatio", header: copy.colGapRatio },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        group: row.label,
        employees: String(row.employeeCount),
        average: formatBenchmarkMoney(row.averageBaseSalary, row.currency),
        range: `${formatBenchmarkMoney(
          row.minimumBaseSalary,
          row.currency
        )} - ${formatBenchmarkMoney(row.maximumBaseSalary, row.currency)}`,
        gap: formatBenchmarkMoney(row.gapAmount, row.currency),
        gapRatio: formatBenchmarkRatio(row.gapRatio),
      },
    })),
  }
}
