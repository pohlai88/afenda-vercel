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
import { requireOrgSession } from "#lib/auth"

import {
  findLeaveEmployeeForUser,
  listLeaveBalancesForEmployee,
  listLeaveRequestsForEmployee,
  type LeaveTypeChoiceRow,
} from "../data/leave-request.queries.server"

import { LeaveCancelButton } from "./leave-cancel-button"
import { LeaveOwnRequestForm } from "./leave-own-request-form"

type LeaveMyPanelProps = {
  leaveTypes: LeaveTypeChoiceRow[]
}

export async function LeaveMyPanel({ leaveTypes }: LeaveMyPanelProps) {
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.leave")
  const employee = await findLeaveEmployeeForUser(
    session.organizationId,
    session.userId
  )

  if (!employee) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("selfServiceNoEmployee")}
      </p>
    )
  }

  const [balances, requests] = await Promise.all([
    listLeaveBalancesForEmployee(
      session.organizationId,
      employee.id,
      new Date().getFullYear()
    ),
    listLeaveRequestsForEmployee(session.organizationId, employee.id),
  ])

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">{t("myBalancesTitle")}</h3>
          {balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("myBalancesEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colLeaveType")}</TableHead>
                  <TableHead>{t("colEntitled")}</TableHead>
                  <TableHead>{t("colTaken")}</TableHead>
                  <TableHead>{t("colPending")}</TableHead>
                  <TableHead>{t("colAvailable")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((balance) => {
                  const available =
                    Number(balance.openingDays) +
                    Number(balance.daysEntitled) +
                    Number(balance.adjustedDays) +
                    Number(balance.carriedForwardDays) -
                    Number(balance.daysTaken) -
                    Number(balance.daysPending)
                  return (
                    <TableRow key={balance.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {balance.leaveTypeCode ?? balance.leaveTypeId}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDays(balance.daysEntitled)}</TableCell>
                      <TableCell>{formatDays(balance.daysTaken)}</TableCell>
                      <TableCell>{formatDays(balance.daysPending)}</TableCell>
                      <TableCell>{formatDays(available)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">{t("myHistoryTitle")}</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("myHistoryEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colLeaveType")}</TableHead>
                  <TableHead>{t("colDates")}</TableHead>
                  <TableHead>{t("colDuration")}</TableHead>
                  <TableHead>{t("colState")}</TableHead>
                  <TableHead className="text-right">
                    {t("colActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.slice(0, 10).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {request.leaveTypeCode ?? request.leaveTypeId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.startDate === request.endDate
                        ? request.startDate
                        : `${request.startDate} -> ${request.endDate}`}
                    </TableCell>
                    <TableCell>{formatDays(request.durationDays)}</TableCell>
                    <TableCell>{t(`state.${request.state}`)}</TableCell>
                    <TableCell className="text-right">
                      {request.state === "submitted" ? (
                        <LeaveCancelButton requestId={request.id} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t("requestLeaveTitle")}</h3>
        {leaveTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("requestLeaveNoTypes")}
          </p>
        ) : (
          <LeaveOwnRequestForm leaveTypes={leaveTypes} />
        )}
      </section>
    </div>
  )
}

function formatDays(value: number | string): string {
  const days = Number(value)
  if (Number.isNaN(days)) return "-"
  return Number.isInteger(days) ? String(days) : days.toFixed(2)
}
