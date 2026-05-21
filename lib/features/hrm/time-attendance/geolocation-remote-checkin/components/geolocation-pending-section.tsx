import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildGeolocationEmbeddedListSurfaceErrorConfiguration } from "../data/geolocation-embedded-list-surface-error.server"
import { buildRemoteCheckinPendingListSurfaceConfiguration } from "../data/geolocation-surface-builders.server"
import { REMOTE_CHECKIN_LIST_SURFACE_IDS } from "../data/geolocation-surface-metadata.shared"
import { listRemoteCheckinExceptionsForOrg } from "../data/geolocation.queries.server"
import { RemoteCheckinDecisionForms } from "./remote-checkin-decision-form.client"

export async function GeolocationPendingInbox({
  organizationId,
  canDecide,
}: {
  organizationId: string
  canDecide: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.Geolocation")
  const tOutcomes = await getTranslations(
    "Dashboard.Hrm.Geolocation.outcomeLabels"
  )
  const tPending = await getTranslations("Dashboard.Hrm.Geolocation.pending")
  const format = await getFormatter()

  let rows: Awaited<ReturnType<typeof listRemoteCheckinExceptionsForOrg>>
  try {
    rows = await listRemoteCheckinExceptionsForOrg(organizationId, {
      states: ["submitted", "returned"],
      limit: 100,
    })
  } catch (err) {
    logUnexpectedServerError("geolocation-pending-inbox: query failed", err, {
      organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={buildGeolocationEmbeddedListSurfaceErrorConfiguration({
          columnsId: REMOTE_CHECKIN_LIST_SURFACE_IDS.pendingExceptions,
          emptyTitle: tPending("empty"),
          firstColumn: { id: "employee", header: tPending("colEmployee") },
        })}
        surfaceKey="hrm:geolocation:pending:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: tPending("loadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildRemoteCheckinPendingListSurfaceConfiguration(
    rows,
    {
      empty: tPending("empty"),
      colEmployee: tPending("colEmployee"),
      colEventType: tPending("colEvent"),
      colWhen: tPending("colSubmittedAt"),
      colOutcome: tPending("colDetected"),
      colReason: tPending("colReason"),
      formatWhen: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
      outcomeLabel: (outcome) =>
        tOutcomes(outcome as Parameters<typeof tOutcomes>[0]),
      decideLabel: t("decision.decideAction"),
    },
    { canDecide }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      surfaceKey="hrm:geolocation:pending"
      listConfiguration={listConfiguration}
      trailingColumn={{
        header: tPending("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (
            !row ||
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot
              trailingAction={surfaceRow.trailingAction}
            >
              <RemoteCheckinDecisionForms exceptionId={row.id} />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
