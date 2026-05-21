import { getTranslations } from "next-intl/server"

import { GovernedComponentRenderer } from "#components2/metadata"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  buildTimeClockKpiStatConfiguration,
  TCI_STAT_SURFACE_KEY,
} from "../data/tci-surface-builders.server"
import type { TimeClockKpiSummary } from "../data/tci.queries.server"

export async function TimeClockKpiSection({
  summary,
  loadError,
}: {
  summary: TimeClockKpiSummary
  loadError?: { title: string; description?: string }
}) {
  const t = await getTranslations("Dashboard.Hrm.timeClock.kpi")

  if (loadError) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {loadError.description ?? loadError.title}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const configuration = buildTimeClockKpiStatConfiguration(summary, {
    activeDevices: t("activeDevices"),
    activeMappings: t("activeMappings"),
    pendingExceptions: t("pendingExceptions"),
    failedSync: t("failedSync"),
    punchesToday: t("punchesToday"),
  })

  return (
    <Card size="sm" data-testid={`governed-stat-section:${TCI_STAT_SURFACE_KEY}`}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <GovernedComponentRenderer
          component={{
            type: "governed:stat-card",
            serverType: "governed:stat-card",
            configuration,
          }}
        />
      </CardContent>
    </Card>
  )
}
