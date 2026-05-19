import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildGeofencesListSurfaceConfiguration } from "../data/geolocation-surface-builders.server"
import type { GeofenceRow } from "../data/geolocation.queries.server"
import type { GeofenceScopeKind } from "../schemas/geolocation-workflow-state.shared"
import { GeofenceDeprecateButton, GeofenceUpsertDialog } from "./geofence-form.client"

const GEOFENCE_FORM_SCOPE_KINDS = [
  "office",
  "branch",
  "project_site",
  "client_site",
  "field_site",
  "home_office",
] as const

type GeofenceFormScopeKind = (typeof GEOFENCE_FORM_SCOPE_KINDS)[number]

function toFormScopeKind(value: GeofenceScopeKind): GeofenceFormScopeKind {
  return (GEOFENCE_FORM_SCOPE_KINDS as readonly string[]).includes(value)
    ? (value as GeofenceFormScopeKind)
    : "office"
}

export async function GeolocationGeofencesSection({
  orgSlug,
  rows,
  canManage,
}: {
  orgSlug: string
  rows: readonly GeofenceRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.Geolocation.geofences")
  const tCommon = await getTranslations("Dashboard.Hrm.Geolocation")

  const yesNo = (value: boolean) => (value ? tCommon("yes") : tCommon("no"))

  const listConfiguration = buildGeofencesListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colCode: t("colCode"),
      colLabel: t("colLabel"),
      colScope: t("colScope"),
      colCenter: t("colCenter"),
      colRadius: t("colRadius"),
      colArchived: t("colActive"),
      yesNo: (value) => yesNo(!value),
      editLabel: t("editOpen"),
    },
    { canManage }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("title")}
      description={t("description")}
      surfaceKey="hrm:geolocation:geofences"
      listConfiguration={listConfiguration}
      headerSlot={
        canManage ? (
          <div className="flex justify-end">
            <GeofenceUpsertDialog orgSlug={orgSlug} mode="create" />
          </div>
        ) : null
      }
      trailingColumn={{
        header: t("colLabel"),
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
              <div className="flex items-center gap-2">
                <GeofenceUpsertDialog
                  orgSlug={orgSlug}
                  mode="edit"
                  defaults={{
                    geofenceId: row.id,
                    code: row.code,
                    label: row.label,
                    scopeKind: toFormScopeKind(row.scopeKind),
                    latitude: row.latitude,
                    longitude: row.longitude,
                    radiusMeters: row.radiusMeters,
                    bufferMeters: row.bufferMeters,
                    countryCode: row.countryCode,
                    legalEntityCode: row.legalEntityCode,
                    notes: row.notes,
                  }}
                />
                {row.archivedAt ? null : (
                  <GeofenceDeprecateButton geofenceId={row.id} />
                )}
              </div>
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
