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

import {
  type OrgLeaveRequestRow,
  listAllLeaveRequestsForOrg,
} from "../server"

import { LeaveDecisionForms } from "./leave-decision-form"

/**
 * Manager inbox — pending leave requests across the organization. Async
 * Server Component streamed behind a Suspense boundary so a slow query
 * does not block the page header. Failures degrade locally to a calm
 * inline notice; we never throw out of this section so the rest of the
 * leave page keeps rendering.
 */
export async function LeavePendingInbox({
  isAdmin,
}: {
  isAdmin: boolean
}) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.leave")

  let rows: OrgLeaveRequestRow[]
  try {
    rows = await listAllLeaveRequestsForOrg(orgSession.organizationId, {
      states: ["submitted"],
      limit: 100,
    })
  } catch (err) {
    logUnexpectedServerError(
      "leave-pending-inbox: query failed",
      err,
      { organizationId: orgSession.organizationId }
    )
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("inboxLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("inboxEmpty")}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colEmployee")}</TableHead>
          <TableHead>{t("colLeaveType")}</TableHead>
          <TableHead>{t("colDates")}</TableHead>
          <TableHead>{t("colDuration")}</TableHead>
          <TableHead>{t("colRequested")}</TableHead>
          {isAdmin ? <TableHead>{t("colActions")}</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
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
              <DateRange
                startDate={row.startDate}
                endDate={row.endDate}
                halfDay={row.halfDay}
              />
            </TableCell>
            <TableCell>
              <DurationDisplay
                durationDays={row.durationDays}
                halfDay={row.halfDay}
              />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {row.requestedAt.toLocaleString()}
            </TableCell>
            {isAdmin ? (
              <TableCell>
                <LeaveDecisionForms
                  requestId={row.id}
                  dateRange={`${row.startDate} → ${row.endDate}`}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DateRange({
  startDate,
  endDate,
  halfDay,
}: {
  startDate: string
  endDate: string
  halfDay: string
}) {
  const isSameDay = startDate === endDate
  const halfTag =
    halfDay === "morning"
      ? " · AM"
      : halfDay === "afternoon"
        ? " · PM"
        : ""

  if (isSameDay) {
    return (
      <span>
        {startDate}
        {halfTag}
      </span>
    )
  }
  return (
    <span>
      {startDate} → {endDate}
    </span>
  )
}

function DurationDisplay({
  durationDays,
  halfDay,
}: {
  durationDays: string
  halfDay: string
}) {
  const days = Number(durationDays)
  if (Number.isNaN(days)) return <span>—</span>
  if (halfDay === "morning" || halfDay === "afternoon") {
    return <span>0.5</span>
  }
  if (Number.isInteger(days)) return <span>{days}</span>
  return <span>{days.toFixed(2)}</span>
}
