import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildOtmEmbeddedListSurfaceErrorConfiguration } from "../data/otm-embedded-list-surface-error.server"
import { buildOtmPendingListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { getOtmDayCategoryLabelMap } from "../data/otm-section-labels.server"
import { listOtmRequestsForOrg } from "../data/otm.queries.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import { OtmDecisionForms } from "./otm-decision-form"
import { OtmPendingBulkApproveToolbar } from "./otm-pending-bulk-approve.client"

export async function OtmPendingInbox({
  organizationId,
  userId,
  canApproveAll,
}: {
  organizationId: string
  userId: string
  canApproveAll: boolean
}) {
  const [t, format, dayCategoryLabels] = await Promise.all([
    getTranslations("Dashboard.Hrm.overtime"),
    getFormatter(),
    getOtmDayCategoryLabelMap(),
  ])

  let rows: Awaited<ReturnType<typeof listOtmRequestsForOrg>>
  try {
    rows = await listOtmRequestsForOrg(organizationId, {
      states: ["submitted"],
      limit: 100,
      assignedApproverUserId: canApproveAll ? undefined : userId,
    })
  } catch (err) {
    logUnexpectedServerError("otm-pending-inbox: query failed", err, {
      organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={buildOtmEmbeddedListSurfaceErrorConfiguration({
          columnsId: OTM_LIST_SURFACE_IDS.pendingInbox,
          emptyTitle: t("inboxEmpty"),
          firstColumn: { id: "employee", header: t("colEmployee") },
        })}
        surfaceKey="hrm:overtime:pending:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("inboxLoadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildOtmPendingListSurfaceConfiguration(
    rows,
    {
      columnsId: OTM_LIST_SURFACE_IDS.pendingInbox,
      empty: t("inboxEmpty"),
      colEmployee: t("colEmployee"),
      colWorkDate: t("colWorkDate"),
      colTimeRange: t("colTimeRange"),
      colDuration: t("colDuration"),
      colDayCategory: t("colDayCategory"),
      colState: t("colState"),
      colRequested: t("colRequested"),
      dayCategoryLabels,
      formatRequestedAt: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
      stateLabelFor: (state) =>
        t(`stateLabels.${state}` as "stateLabels.submitted"),
      approvalStageLabels: {
        manager: t("approvalStageManager"),
        hr: t("approvalStageHr"),
      },
    },
    {
      canApproveAll,
      currentUserId: userId,
      decideLabel: t("decideAction"),
    }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  const bulkRows = rows.map((row) => ({
    id: row.id,
    label: `${row.employeeFullName ?? row.employeeId} · ${row.workDate} · ${row.startTime}–${row.endTime}`,
  }))

  return (
    <div className="flex flex-col gap-4">
      <OtmPendingBulkApproveToolbar rows={bulkRows} />
      <GovernedPatternCListSection
        layout="embedded"
        title={t("pendingTitle")}
        description={t("pendingDescription")}
        surfaceKey={OTM_LIST_SURFACE_IDS.pendingInbox}
        listConfiguration={listConfiguration}
        invalid={{
          variant: "error",
          title: t("inboxLoadFailed"),
        }}
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
                <OtmDecisionForms
                  requestId={row.id}
                  timeRange={`${row.workDate} · ${row.startTime}–${row.endTime}`}
                  workDate={row.workDate}
                  startTime={row.startTime}
                  endTime={row.endTime}
                  approvalStage={row.approvalStage}
                />
              </GovernedTrailingActionSlot>
            )
          },
        }}
      />
    </div>
  )
}
