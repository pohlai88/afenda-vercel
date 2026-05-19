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
  REMOTE_CHECKIN_STAT_SURFACE_KEY,
  buildRemoteCheckinKpiStatConfiguration,
} from "../data/geolocation-surface-builders.server"
import type { RemoteCheckinKpiSummary } from "../data/geolocation.queries.server"

export async function GeolocationKpiSummarySection({
  summary,
  loadError,
}: {
  summary: RemoteCheckinKpiSummary
  loadError?: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.Geolocation.kpi")

  if (loadError) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("loadFailed")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const configuration = buildRemoteCheckinKpiStatConfiguration(summary, {
    verifiedToday: t("verifiedToday"),
    pendingExceptions: t("pendingExceptions"),
    outsideGeofence: t("outsideGeofence"),
    weakAccuracy: t("weakAccuracy"),
    activeGeofences: t("activeGeofences"),
    registeredDevices: t("registeredDevices"),
  })

  return (
    <Card
      size="sm"
      data-testid={`governed-stat-section:${REMOTE_CHECKIN_STAT_SURFACE_KEY}`}
    >
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
