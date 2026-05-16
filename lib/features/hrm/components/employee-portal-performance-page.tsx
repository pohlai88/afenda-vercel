import type { Route } from "next"

import { getFormatter, getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
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
import { employeePortalPerformanceGoalPath } from "#lib/portal"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { listKpiGoalsVisibleToEmployee } from "../data/employee-portal-kpi.queries.server"

import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalPerformancePageProps = {
  portalSlug: string
}

function goalPath(portalSlug: string, goalId: string): Route {
  return employeePortalPerformanceGoalPath(portalSlug, goalId)
}

export async function EmployeePortalPerformancePage({
  portalSlug,
}: EmployeePortalPerformancePageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const [t, navLabels, format, goals] = await Promise.all([
    getTranslations("Dashboard.Hrm.portalPerformance"),
    getEmployeePortalSectionNavLabels(),
    getFormatter(),
    listKpiGoalsVisibleToEmployee({
      organizationId: context.portal.organizationId,
      employeeId: context.employee.id,
    }),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="performance"
        labels={navLabels}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("goalsTitle")}</CardTitle>
          <CardDescription>{t("goalsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("goalsEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colTitle")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colDue")}</TableHead>
                  <TableHead>{t("colProgress")}</TableHead>
                  <TableHead className="text-right">{t("colAction")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell className="font-medium">{goal.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{goal.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {goal.dueDate
                        ? format.dateTime(
                            new Date(`${goal.dueDate}T00:00:00Z`),
                            {
                              dateStyle: "medium",
                            }
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>{goal.percentComplete ?? 0}%</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={goalPath(portalSlug, goal.id)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t("viewGoal")}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
