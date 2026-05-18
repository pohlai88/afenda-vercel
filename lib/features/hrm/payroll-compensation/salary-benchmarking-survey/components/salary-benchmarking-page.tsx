import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"

import { loadSalaryBenchmarkingPageData } from "../data/salary-benchmarking-page.server"

import {
  SalaryBenchmarkAnalysisSection,
  SalaryBenchmarkMappingsSection,
  SalaryBenchmarkMarketDataSection,
  SalaryBenchmarkPayEquitySection,
  SalaryBenchmarkSurveySection,
} from "./salary-benchmarking-sections"

export async function SalaryBenchmarkingPage() {
  const t = await getTranslations("Dashboard.Hrm.salaryBenchmarking")
  const { surveys, marketRows, mappings, analyses, payEquityGroups } =
    await loadSalaryBenchmarkingPageData()

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
      <SalaryBenchmarkSurveySection rows={surveys} />
      <SalaryBenchmarkMarketDataSection rows={marketRows} />
      <SalaryBenchmarkMappingsSection rows={mappings} />
      <SalaryBenchmarkAnalysisSection rows={analyses} />
      <SalaryBenchmarkPayEquitySection rows={payEquityGroups} />
    </div>
  )
}
