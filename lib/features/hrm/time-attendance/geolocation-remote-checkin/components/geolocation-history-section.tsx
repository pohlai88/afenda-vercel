import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedComponentRenderer } from "#components2/metadata"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { buildRemoteCheckinHistoryListSurfaceConfiguration } from "../data/geolocation-surface-builders.server"
import type { RemoteCheckinHistoryRow } from "../data/geolocation.queries.server"

export async function GeolocationHistorySection({
  rows,
  loadError,
}: {
  rows: readonly RemoteCheckinHistoryRow[]
  loadError?: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.Geolocation.history")
  const format = await getFormatter()

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

  const configuration = buildRemoteCheckinHistoryListSurfaceConfiguration(rows, {
    empty: t("empty"),
    colEmployee: t("colEmployee"),
    colEventType: t("colEvent"),
    colWhen: t("colWhen"),
    colLocation: t("colSite"),
    colAccuracy: t("colDevice"),
    colGeofence: t("colSite"),
    formatWhen: (date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <GovernedComponentRenderer
          component={{
            type: "governed:list-surface",
            serverType: "governed:list-surface",
            configuration,
          }}
        />
      </CardContent>
    </Card>
  )
}
