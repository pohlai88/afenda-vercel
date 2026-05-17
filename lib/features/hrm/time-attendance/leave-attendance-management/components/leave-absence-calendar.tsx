import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { leaveRequestStateTone } from "../data/leave-display.shared"
import {
  findLeaveEmployeeForUser,
  listAllLeaveRequestsForOrg,
  type OrgLeaveRequestRow,
} from "../data/leave-request.queries.server"

const ABSENCE_STATES = ["submitted", "approved", "taken"] as const

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

export async function LeaveAbsenceCalendar() {
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.leave")
  const [canReadLeave, canManageLeave] = await Promise.all([
    canUseErpPermission({
      organizationId: session.organizationId,
      userId: session.userId,
      permission: { module: "hrm", object: "leave", function: "read" },
    }),
    canUseErpPermission({
      organizationId: session.organizationId,
      userId: session.userId,
      permission: { module: "hrm", object: "leave", function: "update" },
    }),
  ])
  const canReadOrgLeave = canReadLeave || canManageLeave
  const employee = canReadOrgLeave
    ? null
    : await findLeaveEmployeeForUser(session.organizationId, session.userId)

  if (!canReadOrgLeave && !employee) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("selfServiceNoEmployee")}
      </p>
    )
  }

  let rows: OrgLeaveRequestRow[]
  try {
    rows = await listAllLeaveRequestsForOrg(session.organizationId, {
      states: ABSENCE_STATES,
      limit: 100,
      employeeId: employee?.id,
    })
  } catch (err) {
    logUnexpectedServerError("leave-absence-calendar: query failed", err, {
      organizationId: session.organizationId,
    })
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("absenceLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("absenceEmpty")}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colEmployee")}</TableHead>
          <TableHead>{t("colLeaveType")}</TableHead>
          <TableHead>{t("colDates")}</TableHead>
          <TableHead>{t("colDuration")}</TableHead>
          <TableHead>{t("colState")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const tone = leaveRequestStateTone(row.state)
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
                <Badge variant="outline">{row.leaveTypeCode ?? "-"}</Badge>
              </TableCell>
              <TableCell>
                {row.startDate === row.endDate
                  ? row.startDate
                  : `${row.startDate} -> ${row.endDate}`}
              </TableCell>
              <TableCell>{formatDays(row.durationDays)}</TableCell>
              <TableCell>
                <Badge variant={TONE_BADGE[tone] ?? "outline"}>
                  {t(`state.${row.state}`)}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function formatDays(value: string): string {
  const days = Number(value)
  if (Number.isNaN(days)) return "-"
  return Number.isInteger(days) ? String(days) : days.toFixed(2)
}
