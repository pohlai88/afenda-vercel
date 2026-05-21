import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildTimeClockSyncBatchesListSurfaceConfiguration } from "../data/tci-surface-builders.server"
import {
  toTimeClockListLoadError,
  type TimeClockLoadError,
} from "../data/tci-load-error.shared"
import type { TimeClockSyncBatchRow } from "../data/tci.queries.server"

export async function TimeClockSyncBatchesSection({
  rows,
  loadError,
}: {
  rows: readonly TimeClockSyncBatchRow[]
  loadError?: TimeClockLoadError
}) {
  const t = await getTranslations("Dashboard.Hrm.timeClock.syncBatches")
  const format = await getFormatter()

  const listConfiguration = buildTimeClockSyncBatchesListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colStarted: t("colStarted"),
      colFinished: t("colFinished"),
      colSource: t("colSource"),
      colDevice: t("colDevice"),
      colState: t("colState"),
      colReceived: t("colReceived"),
      colAccepted: t("colAccepted"),
      colRejected: t("colRejected"),
      formatTimestamp: (date) =>
        date
          ? format.dateTime(date, { dateStyle: "medium", timeStyle: "short" })
          : "—",
    }
  )

  return (
    <GovernedPatternCListSection
      title={t("title")}
      description={t("description")}
      surfaceKey="hrm:time-clock:sync-batches"
      listConfiguration={listConfiguration}
      loadError={toTimeClockListLoadError(loadError)}
    />
  )
}
