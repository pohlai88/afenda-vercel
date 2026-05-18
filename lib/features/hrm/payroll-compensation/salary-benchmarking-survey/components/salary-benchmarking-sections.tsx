import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import {
  buildSalaryBenchmarkAnalysisListSurfaceConfiguration,
  buildSalaryBenchmarkMappingListSurfaceConfiguration,
  buildSalaryBenchmarkMarketDataListSurfaceConfiguration,
  buildSalaryBenchmarkPayEquityListSurfaceConfiguration,
  buildSalaryBenchmarkSurveyListSurfaceConfiguration,
} from "../data/salary-benchmarking-list-surface.server"
import type {
  SalaryBenchmarkAnalysisResult,
  SalaryBenchmarkPayEquityGroup,
} from "../data/salary-benchmarking-engine.shared"
import type {
  SalaryBenchmarkMapping,
  SalaryBenchmarkRow,
  SalaryBenchmarkSurvey,
} from "../schemas/salary-benchmarking.schema"

export async function SalaryBenchmarkSurveySection({
  rows,
}: {
  readonly rows: readonly SalaryBenchmarkSurvey[]
}) {
  const t = await getTranslations("Dashboard.Hrm.salaryBenchmarking.tables")
  return (
    <GovernedPatternCListSection
      title={t("surveysTitle")}
      description={t("surveysDescription")}
      surfaceKey="hrm:salary-benchmarking:surveys"
      listConfiguration={buildSalaryBenchmarkSurveyListSurfaceConfiguration(
        rows,
        {
          empty: t("surveysEmpty"),
          colProvider: t("colProvider"),
          colYear: t("colYear"),
          colIndustry: t("colIndustry"),
          colCountry: t("colCountry"),
          colCurrency: t("colCurrency"),
          colVersion: t("colVersion"),
        }
      )}
    />
  )
}

export async function SalaryBenchmarkMarketDataSection({
  rows,
}: {
  readonly rows: readonly SalaryBenchmarkRow[]
}) {
  const t = await getTranslations("Dashboard.Hrm.salaryBenchmarking.tables")
  return (
    <GovernedPatternCListSection
      title={t("marketDataTitle")}
      description={t("marketDataDescription")}
      surfaceKey="hrm:salary-benchmarking:market-data"
      listConfiguration={buildSalaryBenchmarkMarketDataListSurfaceConfiguration(
        rows,
        {
          empty: t("marketDataEmpty"),
          colJob: t("colJob"),
          colFamily: t("colFamily"),
          colLevel: t("colLevel"),
          colMedian: t("colMedian"),
          colP25: t("colP25"),
          colP75: t("colP75"),
          colSample: t("colSample"),
        }
      )}
    />
  )
}

export async function SalaryBenchmarkMappingsSection({
  rows,
}: {
  readonly rows: readonly SalaryBenchmarkMapping[]
}) {
  const t = await getTranslations("Dashboard.Hrm.salaryBenchmarking.tables")
  return (
    <GovernedPatternCListSection
      title={t("mappingsTitle")}
      description={t("mappingsDescription")}
      surfaceKey="hrm:salary-benchmarking:mappings"
      listConfiguration={buildSalaryBenchmarkMappingListSurfaceConfiguration(
        rows,
        {
          empty: t("mappingsEmpty"),
          colJob: t("colJob"),
          colFamily: t("colFamily"),
          colGrade: t("colGrade"),
          colCountry: t("colCountry"),
          colVersion: t("colVersion"),
          colState: t("colState"),
        }
      )}
    />
  )
}

export async function SalaryBenchmarkAnalysisSection({
  rows,
}: {
  readonly rows: readonly SalaryBenchmarkAnalysisResult[]
}) {
  const t = await getTranslations("Dashboard.Hrm.salaryBenchmarking.tables")
  return (
    <GovernedPatternCListSection
      title={t("analysisTitle")}
      description={t("analysisDescription")}
      surfaceKey="hrm:salary-benchmarking:analysis"
      listConfiguration={buildSalaryBenchmarkAnalysisListSurfaceConfiguration(
        rows,
        {
          empty: t("analysisEmpty"),
          colEmployee: t("colEmployee"),
          colScope: t("colScope"),
          colCompared: t("colCompared"),
          colMarketRatio: t("colMarketRatio"),
          colCompaRatio: t("colCompaRatio"),
          colPosition: t("colPosition"),
          colRecommendation: t("colRecommendation"),
        }
      )}
    />
  )
}

export async function SalaryBenchmarkPayEquitySection({
  rows,
}: {
  readonly rows: readonly SalaryBenchmarkPayEquityGroup[]
}) {
  const t = await getTranslations("Dashboard.Hrm.salaryBenchmarking.tables")
  return (
    <GovernedPatternCListSection
      title={t("payEquityTitle")}
      description={t("payEquityDescription")}
      surfaceKey="hrm:salary-benchmarking:pay-equity"
      listConfiguration={buildSalaryBenchmarkPayEquityListSurfaceConfiguration(
        rows,
        {
          empty: t("payEquityEmpty"),
          colGroup: t("colGroup"),
          colEmployees: t("colEmployees"),
          colAverage: t("colAverage"),
          colRange: t("colRange"),
          colGap: t("colGap"),
          colGapRatio: t("colGapRatio"),
        }
      )}
    />
  )
}
