import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import { buildLeavePendingListSurfaceConfiguration } from "../data/leave-list-surface.server"
import {
  type OrgLeaveRequestRow,
  listAllLeaveRequestsForOrg,
} from "../data/leave-request.queries.server"

import { LeaveDecisionForms } from "./leave-decision-form"

export async function LeavePendingInbox({
  canApproveAll,
}: {
  canApproveAll: boolean
}) {
  const [orgSession, t] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.leave"),
  ])

  let rows: OrgLeaveRequestRow[]
  try {
    rows = await listAllLeaveRequestsForOrg(orgSession.organizationId, {
      states: ["submitted"],
      limit: 100,
      assignedApproverUserId: canApproveAll ? undefined : orgSession.userId,
    })
  } catch (err) {
    logUnexpectedServerError("leave-pending-inbox: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: "hrm-leave-pending" },
            columnsId: "hrm-leave-pending",
            rowKey: "id",
            empty: { variant: "muted", title: t("inboxEmpty") },
          },
          columns: [{ id: "employee", header: t("colEmployee") }],
          rows: [],
        }}
        surfaceKey="hrm:leave:pending:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("inboxLoadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildLeavePendingListSurfaceConfiguration(
    rows,
    {
      empty: t("inboxEmpty"),
      colEmployee: t("colEmployee"),
      colLeaveType: t("colLeaveType"),
      colDates: t("colDates"),
      colDuration: t("colDuration"),
      colRequested: t("colRequested"),
    },
    {
      canApproveAll,
      currentUserId: orgSession.userId,
    }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:leave:pending-inbox"
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
              <LeaveDecisionForms
                requestId={row.id}
                dateRange={`${row.startDate} → ${row.endDate}`}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
