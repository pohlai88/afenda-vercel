import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  GovernedTrailingActionSlot,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface/client"

import { buildTimeClockDevicesListSurfaceConfiguration } from "../data/tci-surface-builders.server"
import {
  toTimeClockListLoadError,
  type TimeClockLoadError,
} from "../data/tci-load-error.shared"
import type { TimeClockDeviceRow } from "../data/tci.queries.server"

import {
  TimeClockDeviceRegisterDialog,
  TimeClockDeviceRevokeButton,
} from "./tci-device-forms.client"

export async function TimeClockDevicesSection({
  rows,
  canManage,
  parentAccessAllowed = true,
  loadError,
}: {
  rows: readonly TimeClockDeviceRow[]
  canManage: boolean
  parentAccessAllowed?: boolean
  loadError?: TimeClockLoadError
}) {
  const t = await getTranslations("Dashboard.Hrm.timeClock.devices")
  const format = await getFormatter()

  const listConfiguration = buildTimeClockDevicesListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colName: t("colName"),
      colExternalId: t("colExternalId"),
      colType: t("colType"),
      colLocation: t("colLocation"),
      colState: t("colState"),
      colSync: t("colSync"),
      colLastSync: t("colLastSync"),
      formatLastSync: (date) =>
        date
          ? format.dateTime(date, { dateStyle: "medium", timeStyle: "short" })
          : "—",
      revokeLabel: t("revoke"),
    },
    { canManage }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("title")}
      description={t("description")}
      surfaceKey="hrm:time-clock:devices"
      listConfiguration={listConfiguration}
      parentAccessAllowed={parentAccessAllowed}
      resolveConfiguredPermission={false}
      loadError={toTimeClockListLoadError(loadError)}
      headerSlot={
        canManage ? (
          <div className="flex justify-end">
            <TimeClockDeviceRegisterDialog />
          </div>
        ) : null
      }
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (
            !row ||
            !canManage ||
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={surfaceRow.trailingAction}>
              <TimeClockDeviceRevokeButton deviceId={row.id} />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
