import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import {
  buildKpiPeriodsListSurfaceConfiguration,
  buildKpiScoresListSurfaceConfiguration,
} from "../data/kpi-metrics-list-surface.server"
import type { KpiPeriodRow, KpiScoreListRow } from "../data/kpi.queries.server"

type KpiPeriodsListSectionProps = {
  periods: readonly KpiPeriodRow[]
  formatRange: (period: KpiPeriodRow) => string
}

export async function KpiPeriodsListSection({
  periods,
  formatRange,
}: KpiPeriodsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.kpi")

  const listConfiguration = buildKpiPeriodsListSurfaceConfiguration(periods, {
    empty: t("periodsEmpty"),
    colName: t("fieldName"),
    colRange: t("fieldPeriodStart"),
    colState: t("goalStatus"),
    formatRange,
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:kpi:periods"
    />
  )
}

type KpiScoresListSectionProps = {
  scores: readonly KpiScoreListRow[]
  formatTargets: (score: KpiScoreListRow) => string
}

export async function KpiScoresListSection({
  scores,
  formatTargets,
}: KpiScoresListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.kpi")

  const listConfiguration = buildKpiScoresListSurfaceConfiguration(scores, {
    empty: t("scoresDescription"),
    colEmployee: t("fieldEmployee"),
    colMetric: t("fieldMetricCode"),
    colTargets: t("scoresTitle"),
    formatTargets,
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:kpi:scores"
    />
  )
}
