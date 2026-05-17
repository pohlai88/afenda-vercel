import { getTranslations } from "next-intl/server"

import { GovernedListSurfaceWithTrailingColumn } from "#components2/metadata"
import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import { buildLeavePendingListSurfaceConfiguration } from "../data/leave-list-surface.server"
import {
  type OrgLeaveRequestRow,
  listAllLeaveRequestsForOrg,
} from "../data/leave-request.queries.server"

import { LeaveDecisionForms } from "./leave-decision-form"

/**
 * Manager inbox — pending leave requests. List body is metadata-driven via
 * `GovernedListSurfaceWithTrailingColumn` (ADR-0026 Pattern C); decision
 * forms stay in a trailing column (not serializable in list-surface cells).
 */
export async function LeavePendingInbox({
  canApproveAll,
}: {
  canApproveAll: boolean
}) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.leave")

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
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("inboxLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("inboxEmpty")}</p>
  }

  const listConfiguration = buildLeavePendingListSurfaceConfiguration(rows, {
    empty: t("inboxEmpty"),
    colEmployee: t("colEmployee"),
    colLeaveType: t("colLeaveType"),
    colDates: t("colDates"),
    colDuration: t("colDuration"),
    colRequested: t("colRequested"),
  })

  const parsed = parseListSurfaceRendererConfiguration(listConfiguration)
  if (!parsed.success) {
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("inboxLoadFailed")}
      </p>
    )
  }

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedListSurfaceWithTrailingColumn
      columns={parsed.data.columns}
      rows={parsed.data.rows}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (!row) return null
          if (
            !canApproveAll &&
            row.currentApproverUserId !== orgSession.userId
          ) {
            return null
          }
          return (
            <LeaveDecisionForms
              requestId={row.id}
              dateRange={`${row.startDate} → ${row.endDate}`}
            />
          )
        },
      }}
    />
  )
}
