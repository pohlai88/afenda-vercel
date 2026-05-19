import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"

import { formatFwaDateRange } from "../data/fwa-display.shared"
import { buildFwaPendingListSurfaceConfiguration } from "../data/fwa-surface-builders.server"
import { listFwaRequestsForOrg } from "../data/fwa.queries.server"
import { FWA_LIST_SURFACE_IDS } from "../data/fwa-surface-metadata.shared"
import { FwaDecisionForms } from "./fwa-decision-form"

export async function FwaPendingInbox({
  organizationId,
  userId,
  canApproveAll,
}: {
  organizationId: string
  userId: string
  canApproveAll: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.flexibleWork")
  const format = await getFormatter()

  let rows: Awaited<ReturnType<typeof listFwaRequestsForOrg>>
  try {
    rows = await listFwaRequestsForOrg(organizationId, {
      states: ["submitted"],
      limit: 100,
      assignedApproverUserId: canApproveAll ? undefined : userId,
    })
  } catch (err) {
    logUnexpectedServerError("fwa-pending-inbox: query failed", err, {
      organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: FWA_LIST_SURFACE_IDS.pendingInbox },
            columnsId: FWA_LIST_SURFACE_IDS.pendingInbox,
            rowKey: "id",
            empty: { variant: "muted", title: t("inboxEmpty") },
          },
          columns: [{ id: "employee", header: t("colEmployee") }],
          rows: [],
        }}
        surfaceKey="hrm:flexible-work:pending:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("inboxLoadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildFwaPendingListSurfaceConfiguration(
    rows,
    {
      columnsId: FWA_LIST_SURFACE_IDS.pendingInbox,
      empty: t("inboxEmpty"),
      colEmployee: t("colEmployee"),
      colType: t("colType"),
      colDates: t("colDates"),
      colState: t("colState"),
      colRequested: t("colRequested"),
      formatRequestedAt: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
      stateLabelFor: (state) =>
        t(`stateLabels.${state}` as "stateLabels.submitted"),
    },
    {
      canApproveAll,
      currentUserId: userId,
      decideLabel: t("decideAction"),
    }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title={t("pendingTitle")}
      description={t("pendingDescription")}
      surfaceKey="hrm:flexible-work:pending"
      listConfiguration={listConfiguration}
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
            <GovernedTrailingActionSlot
              trailingAction={surfaceRow.trailingAction}
            >
              <FwaDecisionForms
                requestId={row.id}
                dateRange={formatFwaDateRange({
                  startDate: row.startDate,
                  endDate: row.endDate,
                })}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
