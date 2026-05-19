import { getTranslations } from "next-intl/server"
import type { Route } from "next"

import { ModulePageHeader } from "#features/governed-surface"
import { Button } from "#components2/ui/button"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { Link } from "#i18n/navigation"

import { organizationHrmPath } from "../../../constants"
import type { AatSurfaceAccess } from "../data/aat-access.server"
import { loadAbsenceAnalyticsPageData } from "../data/aat-page.server"
import type { AatOrgAnalyticsSnapshot } from "../data/aat-analytics.queries.server"
import {
  parseAatPeriodKey,
  parseAatScopeKey,
  type AatPeriodKey,
  type AatScopeKey,
} from "../schemas/aat.schema"
import { AAT_DEFAULT_THRESHOLD_CONFIG } from "../schemas/aat-threshold.schema"
import { AatExportReportButton } from "./aat-export-report-button.client"
import { AatThresholdSettingsForm } from "./aat-threshold-settings.client"
import {
  AatDailyHeatmapSection,
  AatDepartmentRankingSection,
  AatExceptionTrendsSection,
  AatHighRiskEmployeesSection,
  AatKpiSummarySection,
  AatLeaveTypeBreakdownSection,
  AatTrendChartSection,
} from "./aat-sections"

type AbsenceAnalyticsPageProps = {
  orgSlug: string
  organizationId: string
  userId: string
  sessionId: string | null
  period?: string
  scope?: string
  access: AatSurfaceAccess
}

const PERIOD_OPTIONS: readonly AatPeriodKey[] = [
  "30d",
  "90d",
  "month",
  "quarter",
]

const SCOPE_OPTIONS: readonly AatScopeKey[] = ["org", "team"]

const EMPTY_SNAPSHOT: AatOrgAnalyticsSnapshot = {
  scope: "org",
  period: "30d",
  range: {
    startDate: "",
    endDate: "",
    priorStartDate: "",
    priorEndDate: "",
  },
  calendarDays: 0,
  activeEmployeeCount: 0,
  lostWorkdays: 0,
  absenceFrequency: 0,
  absenceRate: 0,
  priorAbsenceRate: 0,
  trendDirection: "stable",
  plannedLostWorkdays: 0,
  unplannedLostWorkdays: 0,
  availabilityRate: 1,
  coverageRisk: false,
  mondayFridayAbsenceCount: 0,
  shortAbsencePatternCount: 0,
  holidayAdjacentAbsenceCount: 0,
  departmentRanking: [],
  highRiskEmployees: [],
  exceptionTrends: [],
  leaveTypeBreakdown: [],
  weeklyTrend: [],
  dailyHeatmap: [],
}

function aatNavHref(
  basePath: Route,
  period: AatPeriodKey,
  scope: AatScopeKey
): Route {
  const params = new URLSearchParams()
  if (period !== "30d") {
    params.set("period", period)
  }
  if (scope !== "org") {
    params.set("scope", scope)
  }
  const query = params.toString()
  return (query ? `${basePath}?${query}` : basePath) as Route
}

export async function AbsenceAnalyticsPage({
  orgSlug,
  organizationId,
  userId,
  sessionId,
  period: periodRaw,
  scope: scopeRaw,
  access,
}: AbsenceAnalyticsPageProps) {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")

  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  const period = parseAatPeriodKey(periodRaw)
  const scope =
    access.canViewTeamScope && parseAatScopeKey(scopeRaw) === "team"
      ? "team"
      : "org"
  const basePath = organizationHrmPath(orgSlug, "absence-analytics")

  const pageData = await loadAbsenceAnalyticsPageData({
    organizationId,
    userId,
    sessionId,
    period,
    scope,
    access,
  })

  const loadError = !pageData.ok
  const snapshot = pageData.ok
    ? pageData.snapshot
    : { ...EMPTY_SNAPSHOT, period, scope }
  const thresholds = pageData.ok
    ? pageData.thresholds
    : AAT_DEFAULT_THRESHOLD_CONFIG

  const periodNav = (
    <div className="inline-flex w-fit flex-wrap gap-1 rounded-full bg-muted p-1">
      {PERIOD_OPTIONS.map((option) => (
        <Button
          key={option}
          variant={period === option ? "secondary" : "ghost"}
          size="sm"
          asChild
        >
          <Link href={aatNavHref(basePath, option, scope)} prefetch={false}>
            {t(`period.${option}`)}
          </Link>
        </Button>
      ))}
    </div>
  )

  const scopeNav = access.canViewTeamScope ? (
    <div className="inline-flex w-fit flex-wrap gap-1 rounded-full bg-muted p-1">
      {SCOPE_OPTIONS.map((option) => (
        <Button
          key={option}
          variant={scope === option ? "secondary" : "ghost"}
          size="sm"
          asChild
        >
          <Link href={aatNavHref(basePath, period, option)} prefetch={false}>
            {t(`scope.${option}`)}
          </Link>
        </Button>
      ))}
    </div>
  ) : null

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ModulePageHeader
          eyebrow={t("eyebrow")}
          title={t("pageTitle")}
          description={t("pageDescription")}
        />
        {access.canExportReport ? (
          <AatExportReportButton period={period} scope={scope} />
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {periodNav}
        {scopeNav}
      </div>

      <AatKpiSummarySection snapshot={snapshot} loadError={loadError} />

      {access.canConfigureThresholds ? (
        <AatThresholdSettingsForm thresholds={thresholds} />
      ) : null}

      <AatLeaveTypeBreakdownSection snapshot={snapshot} loadError={loadError} />

      <div className="grid gap-4 xl:grid-cols-2">
        <AatTrendChartSection snapshot={snapshot} loadError={loadError} />
        <AatDailyHeatmapSection snapshot={snapshot} loadError={loadError} />
      </div>

      <AatExceptionTrendsSection snapshot={snapshot} loadError={loadError} />

      <div className="grid gap-4 xl:grid-cols-2">
        <AatDepartmentRankingSection snapshot={snapshot} loadError={loadError} />
        <AatHighRiskEmployeesSection snapshot={snapshot} loadError={loadError} />
      </div>
    </div>
  )
}
