import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import {
  listActiveLeaveTypesForOrg,
  listLeaveBalancesForEmployee,
  listLeaveRequestsForEmployee,
} from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"

import { EmployeePortalLeaveCancelButton } from "./employee-portal-leave-cancel-button"
import { EmployeePortalLeaveRequestForm } from "./employee-portal-leave-request-form"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalLeavePageProps = {
  portalSlug: string
}

export async function EmployeePortalLeavePage({
  portalSlug,
}: EmployeePortalLeavePageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const [t, navLabels, leaveTypes, balances, requests] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getEmployeePortalSectionNavLabels(),
    listActiveLeaveTypesForOrg(organizationId),
    listLeaveBalancesForEmployee(
      organizationId,
      employeeId,
      new Date().getFullYear()
    ),
    listLeaveRequestsForEmployee(organizationId, employeeId),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("portalEmployee", {
            employeeNumber: context.employee.employeeNumber,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-normal">
            {t("portalPageTitle")}
          </h1>
          <Badge variant="outline">{context.employee.legalName}</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("portalPageDescription")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="leave"
        labels={navLabels}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">
                {t("myBalancesTitle")}
              </CardTitle>
              <CardDescription>{t("myBalancesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
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
                          <TableCell>
                            {formatDays(balance.daysEntitled)}
                          </TableCell>
                          <TableCell>{formatDays(balance.daysTaken)}</TableCell>
                          <TableCell>
                            {formatDays(balance.daysPending)}
                          </TableCell>
                          <TableCell>{formatDays(available)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("myHistoryTitle")}</CardTitle>
              <CardDescription>{t("myHistoryDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <TableCell>
                          {formatDays(request.durationDays)}
                        </TableCell>
                        <TableCell>{t(`state.${request.state}`)}</TableCell>
                        <TableCell className="text-right">
                          {request.state === "submitted" ? (
                            <EmployeePortalLeaveCancelButton
                              portalSlug={context.portal.portalSlug}
                              requestId={request.id}
                            />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("requestLeaveTitle")}
            </CardTitle>
            <CardDescription>{t("requestLeaveDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {leaveTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("requestLeaveNoTypes")}
              </p>
            ) : (
              <EmployeePortalLeaveRequestForm
                portalSlug={context.portal.portalSlug}
                leaveTypes={leaveTypes}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatDays(value: number | string): string {
  const days = Number(value)
  if (Number.isNaN(days)) return "-"
  return Number.isInteger(days) ? String(days) : days.toFixed(2)
}
