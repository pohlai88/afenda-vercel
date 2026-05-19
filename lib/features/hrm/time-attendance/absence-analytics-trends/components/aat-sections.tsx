import { getTranslations } from "next-intl/server"

import { GovernedComponentRenderer } from "#components2/metadata"
import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  buildAatDepartmentRankingListSurface,
  buildAatExceptionTrendsListSurface,
  buildAatHighRiskEmployeesListSurface,
  buildAatLeaveTypeBreakdownListSurface,
} from "../data/aat-list-surface.server"
import type { AatOrgAnalyticsSnapshot } from "../data/aat-analytics.queries.server"
import { aatRiskTierMessageKey } from "../data/aat-display.shared"
import type { AatRiskTier } from "../schemas/aat.schema"
import {
  AAT_CHART_SURFACE_KEY,
  AAT_HEATMAP_SURFACE_KEY,
  AAT_LIST_SURFACE_IDS,
  AAT_STAT_SURFACE_KEY,
} from "../data/aat-surface-metadata.shared"
import {
  buildAatDailyHeatmapChartConfiguration,
  buildAatKpiStatConfiguration,
  buildAatTrendChartConfiguration,
} from "../data/aat-surface-builders.server"
import {
  aatTrendStatTone,
} from "../data/aat-display.shared"

type AatAnalyticsSectionsProps = {
  snapshot: AatOrgAnalyticsSnapshot
  loadError?: boolean
}

export async function AatKpiSummarySection({
  snapshot,
  loadError,
}: AatAnalyticsSectionsProps) {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")

  if (loadError) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("kpiTitle")}</CardTitle>
          <CardDescription>{t("loadFailed")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const configuration = buildAatKpiStatConfiguration(snapshot, {
    absenceRate: t("kpiAbsenceRate"),
    lostWorkdays: t("kpiLostWorkdays"),
    absenceFrequency: t("kpiFrequency"),
    availability: t("kpiAvailability"),
    trend: t("kpiTrend"),
    plannedVsUnplanned: t("kpiPlannedUnplanned"),
    coverageRisk: t("coverageRiskFlag"),
    patternSignals: t("patternSignalsSummary", {
      mondayFriday: snapshot.mondayFridayAbsenceCount,
      shortAbsence: snapshot.shortAbsencePatternCount,
      holidayAdjacent: snapshot.holidayAdjacentAbsenceCount,
    }),
    trendDirectionLabel: t(`trendDirection.${snapshot.trendDirection}`),
    trendTone: aatTrendStatTone(snapshot.trendDirection),
  })

  return (
    <div data-testid={`governed-stat-section:${AAT_STAT_SURFACE_KEY}`}>
      <GovernedComponentRenderer
        component={{
          type: "governed:stat-card",
          serverType: "governed:stat-card",
          configuration,
        }}
      />
    </div>
  )
}

export async function AatTrendChartSection({
  snapshot,
  loadError,
}: AatAnalyticsSectionsProps) {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")

  if (loadError) {
    return null
  }

  const configuration = buildAatTrendChartConfiguration(
    snapshot,
    t("trendChartTitle")
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("trendChartTitle")}</CardTitle>
        <CardDescription>{t("trendChartDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div data-testid={`governed-chart-section:${AAT_CHART_SURFACE_KEY}`}>
          <GovernedComponentRenderer
            component={{
              type: "governed:chart",
              serverType: "governed:chart",
              configuration,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export async function AatDailyHeatmapSection({
  snapshot,
  loadError,
}: AatAnalyticsSectionsProps) {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")

  if (loadError) {
    return null
  }

  const configuration = buildAatDailyHeatmapChartConfiguration(
    snapshot,
    t("heatmapTitle")
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("heatmapTitle")}</CardTitle>
        <CardDescription>{t("heatmapDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div data-testid={`governed-chart-section:${AAT_HEATMAP_SURFACE_KEY}`}>
          <GovernedComponentRenderer
            component={{
              type: "governed:chart",
              serverType: "governed:chart",
              configuration,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export async function AatLeaveTypeBreakdownSection({
  snapshot,
  loadError,
}: AatAnalyticsSectionsProps) {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")

  return (
    <GovernedPatternCListSection
      title={t("leaveTypeTitle")}
      description={t("leaveTypeDescription")}
      surfaceKey={AAT_LIST_SURFACE_IDS.leaveTypeBreakdown}
      loadError={
        loadError
          ? { variant: "muted", title: t("loadFailed") }
          : undefined
      }
      listConfiguration={buildAatLeaveTypeBreakdownListSurface(
        snapshot.leaveTypeBreakdown,
        {
          empty: t("leaveTypeEmpty"),
          colLeaveType: t("colLeaveType"),
          colLostDays: t("colLostDays"),
          colFrequency: t("colFrequency"),
          labelFor: (code) => t("leaveTypeCodeLabel", { code }),
        }
      )}
    />
  )
}

export async function AatDepartmentRankingSection({
  snapshot,
  loadError,
}: AatAnalyticsSectionsProps) {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")
  const riskLabelFor = (tier: AatRiskTier) => t(aatRiskTierMessageKey(tier))

  return (
    <GovernedPatternCListSection
      title={t("departmentTitle")}
      description={t("departmentDescription")}
      surfaceKey={AAT_LIST_SURFACE_IDS.departmentRanking}
      loadError={
        loadError
          ? { variant: "muted", title: t("loadFailed") }
          : undefined
      }
      listConfiguration={buildAatDepartmentRankingListSurface(
        snapshot.departmentRanking,
        {
          empty: t("departmentEmpty"),
          colDepartment: t("colDepartment"),
          colEmployees: t("colEmployees"),
          colLostDays: t("colLostDays"),
          colRate: t("colRate"),
          colRisk: t("colRisk"),
          riskLabelFor,
        }
      )}
    />
  )
}

export async function AatHighRiskEmployeesSection({
  snapshot,
  loadError,
}: AatAnalyticsSectionsProps) {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")
  const riskLabelFor = (tier: AatRiskTier) => t(aatRiskTierMessageKey(tier))

  return (
    <GovernedPatternCListSection
      title={t("highRiskTitle")}
      description={t("highRiskDescription")}
      surfaceKey={AAT_LIST_SURFACE_IDS.highRiskEmployees}
      loadError={
        loadError
          ? { variant: "muted", title: t("loadFailed") }
          : undefined
      }
      listConfiguration={buildAatHighRiskEmployeesListSurface(
        snapshot.highRiskEmployees,
        {
          empty: t("highRiskEmpty"),
          colEmployee: t("colEmployee"),
          colDepartment: t("colDepartment"),
          colFrequency: t("colFrequency"),
          colLostDays: t("colLostDays"),
          colRate: t("colRate"),
          colRisk: t("colRisk"),
          colPatterns: t("colPatterns"),
          colReason: t("colReason"),
          riskLabelFor,
        }
      )}
    />
  )
}

export async function AatExceptionTrendsSection({
  snapshot,
  loadError,
}: AatAnalyticsSectionsProps) {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")

  return (
    <GovernedPatternCListSection
      title={t("exceptionTitle")}
      description={t("exceptionDescription")}
      surfaceKey={AAT_LIST_SURFACE_IDS.exceptionTrends}
      loadError={
        loadError
          ? { variant: "muted", title: t("loadFailed") }
          : undefined
      }
      listConfiguration={buildAatExceptionTrendsListSurface(
        snapshot.exceptionTrends,
        {
          empty: t("exceptionEmpty"),
          colKind: t("colExceptionKind"),
          colCount: t("colCount"),
          labelFor: (kind) => {
            switch (kind) {
              case "late_arrival":
                return t("exceptionLate")
              case "early_departure":
                return t("exceptionEarly")
              case "absence":
                return t("exceptionAbsence")
              case "missing_punch":
                return t("exceptionMissingPunch")
              default:
                return kind
            }
          },
        }
      )}
    />
  )
}
