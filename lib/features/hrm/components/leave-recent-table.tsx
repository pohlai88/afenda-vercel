import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import { leaveRequestStateTone } from "../data/leave-display.shared"
import { type OrgLeaveRequestRow, listAllLeaveRequestsForOrg } from "../server"

import { LeaveCancelButton } from "./leave-cancel-button"

const RECENT_STATES = ["approved", "rejected", "cancelled", "taken"] as const

type RecentState = (typeof RECENT_STATES)[number]

const STATE_LABEL_KEY: Record<RecentState, `state.${RecentState}`> = {
  approved: "state.approved",
  rejected: "state.rejected",
  cancelled: "state.cancelled",
  taken: "state.taken",
}

const TONE_BADGE: Record<
  string,
  "default" | "outline" | "secondary" | "destructive" | "success" | "info"
> = {
  info: "info",
  positive: "success",
  destructive: "destructive",
  muted: "outline",
  neutral: "outline",
}

function isRecentState(value: string): value is RecentState {
  return (RECENT_STATES as readonly string[]).includes(value)
}

/**
 * Recent leave activity (approved / rejected / cancelled / taken).
 * Streamed behind Suspense; failures degrade locally so the inbox
 * card above keeps rendering.
 */
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
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("recentLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("recentEmpty")}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colEmployee")}</TableHead>
          <TableHead>{t("colLeaveType")}</TableHead>
          <TableHead>{t("colDates")}</TableHead>
          <TableHead>{t("colState")}</TableHead>
          <TableHead>{t("colUpdated")}</TableHead>
          {isAdmin ? (
            <TableHead className="text-right">{t("colActions")}</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const tone = leaveRequestStateTone(row.state)
          const variant = TONE_BADGE[tone] ?? "outline"
          const stateLabel = isRecentState(row.state)
            ? t(STATE_LABEL_KEY[row.state])
            : row.state
          return (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {row.employeeFullName ?? row.employeeId}
                  </span>
                  {row.employeeNumber ? (
                    <span className="text-xs text-muted-foreground">
                      {row.employeeNumber}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{row.leaveTypeCode ?? "—"}</Badge>
              </TableCell>
              <TableCell>
                {row.startDate === row.endDate
                  ? row.startDate
                  : `${row.startDate} → ${row.endDate}`}
              </TableCell>
              <TableCell>
                <Badge variant={variant}>{stateLabel}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {(row.approvedAt ?? row.updatedAt).toLocaleString()}
              </TableCell>
              {isAdmin ? (
                <TableCell className="text-right">
                  {row.state === "approved" || row.state === "submitted" ? (
                    <LeaveCancelButton requestId={row.id} />
                  ) : null}
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
