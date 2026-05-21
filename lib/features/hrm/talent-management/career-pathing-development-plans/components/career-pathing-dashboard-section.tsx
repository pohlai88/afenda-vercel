import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { countActiveCareerPathFrameworksForOrg } from "../data/career-path-framework.queries.server"
import { buildCareerPathingEmbeddedListSurfaceErrorConfiguration } from "../data/career-pathing-embedded-list-surface-error.server"
import { buildDashboardKpiSurfaceConfiguration } from "../data/career-pathing-list-surface.server"
import {
  countActivePlansForOrg,
  countOverdueMilestonesForOrg,
  listLatestReadinessForOrg,
} from "../data/career-pathing.queries.server"
import { CAREER_PATHING_LIST_SURFACE_IDS } from "../data/career-pathing-surface-metadata.shared"

export async function CareerPathingDashboardSection({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("Dashboard.Hrm.careerPathing")

  let activeFrameworks: number
  let activePlans: number
  let overdueMilestones: number
  let readiness: Awaited<ReturnType<typeof listLatestReadinessForOrg>>

  try {
    ;[activeFrameworks, activePlans, overdueMilestones, readiness] = await Promise.all([
      countActiveCareerPathFrameworksForOrg(organizationId),
      countActivePlansForOrg(organizationId),
      countOverdueMilestonesForOrg(organizationId),
      listLatestReadinessForOrg(organizationId),
    ])
  } catch (err) {
    logUnexpectedServerError("career-pathing-dashboard: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("dashboardTitle")}</CardTitle>
          <CardDescription>{t("dashboardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
              columnsId: CAREER_PATHING_LIST_SURFACE_IDS.dashboardKpi,
              emptyTitle: t("dashboardTitle"),
              firstColumn: { id: "label", header: "" },
            })}
            surfaceKey="hrm:career-pathing:dashboard-kpi:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("dashboardLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const nearReadyCount = readiness.filter(
    (row) => row.readinessLevel === "near_ready" || row.readinessLevel === "ready"
  ).length

  const listConfiguration = buildDashboardKpiSurfaceConfiguration({
    activeFrameworks,
    activePlans,
    overdueMilestones,
    nearReadyCount,
    labels: {
      frameworks: t("kpiFrameworks"),
      plans: t("kpiPlans"),
      overdue: t("kpiOverdue"),
      nearReady: t("kpiNearReady"),
    },
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("dashboardTitle")}</CardTitle>
        <CardDescription>{t("dashboardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <GovernedPatternCListSection
          title={t("dashboardTitle")}
          description={t("dashboardDescription")}
          listConfiguration={listConfiguration}
          surfaceKey="hrm:career-pathing:dashboard-kpi"
          layout="embedded"
          resolveConfiguredPermission={false}
        />
      </CardContent>
    </Card>
  )
}
