import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildRemoteCheckinHistoryListSurfaceConfiguration } from "../data/geolocation-surface-builders.server"
import {
  toGeolocationListLoadError,
  type GeolocationLoadError,
} from "../data/geolocation-load-error.shared"
import type { RemoteCheckinHistoryRow } from "../data/geolocation.queries.server"

export async function GeolocationHistorySection({
  rows,
  loadError,
}: {
  rows: readonly RemoteCheckinHistoryRow[]
  loadError?: GeolocationLoadError
}) {
  const t = await getTranslations("Dashboard.Hrm.Geolocation.history")
  const format = await getFormatter()

  const listConfiguration = buildRemoteCheckinHistoryListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colEmployee: t("colEmployee"),
      colEventType: t("colEvent"),
      colWhen: t("colWhen"),
      colLocation: t("colLocation"),
      colAccuracy: t("colAccuracy"),
      colGeofence: t("colGeofence"),
      formatWhen: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
    }
  )

  return (
    <GovernedPatternCListSection
      title={t("title")}
      description={t("description")}
      surfaceKey="hrm:geolocation:history"
      listConfiguration={listConfiguration}
      loadError={toGeolocationListLoadError(loadError)}
      resolveConfiguredPermission={false}
    />
  )
}
