import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import { buildLeaveRecentListSurfaceConfiguration } from "../data/leave-list-surface.server"
import {
  type OrgLeaveRequestRow,
  listAllLeaveRequestsForOrg,
} from "../data/leave-request.queries.server"

import { LeaveCancelButton } from "./leave-cancel-button"

const RECENT_STATES = [
  "approved",
  "rejected",
  "returned",
  "cancelled",
  "taken",
] as const

type RecentState = (typeof RECENT_STATES)[number]

const STATE_LABEL_KEY: Record<RecentState, `state.${RecentState}`> = {
  approved: "state.approved",
  rejected: "state.rejected",
  returned: "state.returned",
  cancelled: "state.cancelled",
  taken: "state.taken",
}

function isRecentState(value: string): value is RecentState {
  return (RECENT_STATES as readonly string[]).includes(value)
}

export async function LeaveRecentTable({ isAdmin }: { isAdmin: boolean }) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.leave")

  let rows: OrgLeaveRequestRow[]
  try {
    rows = await listAllLeaveRequestsForOrg(orgSession.organizationId, {
      states: RECENT_STATES,
      limit: 50,
    })
  } catch (err) {
    logUnexpectedServerError("leave-recent-table: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: "hrm-leave-recent" },
            columnsId: "hrm-leave-recent",
            rowKey: "id",
            empty: { variant: "muted", title: t("recentEmpty") },
          },
          columns: [{ id: "employee", header: t("colEmployee") }],
          rows: [],
        }}
        surfaceKey="hrm:leave:recent:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("recentLoadFailed"),
        }}
      />
    )
  }

  const stateLabelFor = (state: string) =>
    isRecentState(state) ? t(STATE_LABEL_KEY[state]) : state

  const listConfiguration = buildLeaveRecentListSurfaceConfiguration(rows, {
    empty: t("recentEmpty"),
    colEmployee: t("colEmployee"),
    colLeaveType: t("colLeaveType"),
    colDates: t("colDates"),
    colState: t("colState"),
    colUpdated: t("colUpdated"),
    stateLabelFor,
  })

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:leave:recent"
      invalid={{
        variant: "error",
        title: t("recentLoadFailed"),
      }}
      trailingColumn={
        isAdmin
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const row = rowById.get(surfaceRow.id)
                if (
                  !row ||
                  !isListSurfaceTrailingActionRenderable(
                    surfaceRow.trailingAction
                  )
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot
                    trailingAction={surfaceRow.trailingAction}
                  >
                    <LeaveCancelButton requestId={row.id} />
                  </GovernedTrailingActionSlot>
                )
              },
            }
          : undefined
      }
    />
  )
}
