import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildRemoteCheckinDevicesListSurfaceConfiguration } from "../data/geolocation-surface-builders.server"
import type { RemoteCheckinDeviceRow } from "../data/geolocation.queries.server"

import {
  RemoteCheckinDeviceRegisterDialog,
  RemoteCheckinDeviceRevokeButton,
} from "./remote-checkin-device-forms.client"

export async function GeolocationDevicesSection({
  orgSlug,
  rows,
  canManage,
  employeeChoices,
}: {
  orgSlug: string
  rows: readonly RemoteCheckinDeviceRow[]
  canManage: boolean
  employeeChoices: ReadonlyArray<{ id: string; label: string }>
}) {
  const t = await getTranslations("Dashboard.Hrm.Geolocation.devices")
  const format = await getFormatter()

  const listConfiguration = buildRemoteCheckinDevicesListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colEmployee: t("colEmployee"),
      colLabel: t("colLabel"),
      colState: t("colState"),
      colLastSeen: t("colLastSeen"),
      colCreated: t("colLastSeen"),
      formatLastSeen: (date) =>
        date
          ? format.dateTime(date, { dateStyle: "medium", timeStyle: "short" })
          : "—",
      formatCreated: (date) =>
        format.dateTime(date, { dateStyle: "medium" }),
      revokeLabel: t("revokeOpen"),
      reinstateLabel: t("registerOpen"),
    },
    { canManage }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("title")}
      description={t("description")}
      surfaceKey="hrm:geolocation:devices"
      listConfiguration={listConfiguration}
      headerSlot={
        canManage ? (
          <div className="flex justify-end">
            <RemoteCheckinDeviceRegisterDialog
              orgSlug={orgSlug}
              employees={employeeChoices}
            />
          </div>
        ) : null
      }
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (
            !row ||
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={surfaceRow.trailingAction}>
              <RemoteCheckinDeviceRevokeButton
                deviceId={row.id}
                deviceLabel={row.deviceLabel}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
