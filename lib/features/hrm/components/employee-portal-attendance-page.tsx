import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import {
  listAttendanceDaysForEmployee,
  listAttendanceEventsForDate,
} from "../data/attendance.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalAttendanceCorrectionForm } from "./employee-portal-attendance-correction-form.client"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalAttendancePageProps = {
  portalSlug: string
}

function utcMonthRange(d = new Date()): { fromDate: string; toDate: string } {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const pad = (n: number) => String(n).padStart(2, "0")
  const fromDate = `${y}-${pad(m + 1)}-01`
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const toDate = `${y}-${pad(m + 1)}-${pad(last)}`
  return { fromDate, toDate }
}

function recentUtcDates(count: number): string[] {
  const out: string[] = []
  const base = new Date()
  for (let i = 0; i < count; i += 1) {
    const x = new Date(base)
    x.setUTCDate(x.getUTCDate() - i)
    out.push(x.toISOString().slice(0, 10))
  }
  return out
}

export async function EmployeePortalAttendancePage({
  portalSlug,
}: EmployeePortalAttendancePageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const { fromDate, toDate } = utcMonthRange()
  const recentDates = recentUtcDates(14)

  const [tLeave, t, navLabels, days, ...eventLists] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getTranslations("Dashboard.Hrm.portalAttendance"),
    getEmployeePortalSectionNavLabels(),
    listAttendanceDaysForEmployee({
      organizationId,
      employeeId,
      fromDate,
      toDate,
    }),
    ...recentDates.map((attendanceDate) =>
      listAttendanceEventsForDate({
        organizationId,
        employeeId,
        attendanceDate,
      })
    ),
  ])

  const recentEvents = eventLists.flat()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {tLeave("portalEmployee", {
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
        current="attendance"
        labels={navLabels}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("daysTitle")}</CardTitle>
            <CardDescription>{t("portalPageDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {days.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("daysEmpty")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colDate")}</TableHead>
                    <TableHead>{t("colWorked")}</TableHead>
                    <TableHead>{t("colState")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.attendanceDate}</TableCell>
                      <TableCell>{String(row.workedMinutes ?? 0)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.state}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("correctionsTitle")}</CardTitle>
            <CardDescription>{t("correctionHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeePortalAttendanceCorrectionForm
              portalSlug={context.portal.portalSlug}
              events={recentEvents}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
