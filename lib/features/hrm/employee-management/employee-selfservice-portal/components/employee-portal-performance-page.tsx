import type { Route } from "next"

import { getFormatter, getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { employeePortalPerformanceGoalPath } from "#lib/portal"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { listKpiGoalsVisibleToEmployee } from "../data/employee-portal-kpi.queries.server"
import { buildEmployeePortalPerformanceGoalsListSurfaceConfiguration } from "../data/employee-portal-list-surface.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalGovernedTable } from "./employee-portal-governed-table"
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

  const listConfiguration =
    buildEmployeePortalPerformanceGoalsListSurfaceConfiguration(goals, {
      empty: t("goalsEmpty"),
      colTitle: t("colTitle"),
      colStatus: t("colStatus"),
      colDue: t("colDue"),
      colProgress: t("colProgress"),
      formatDue: (dueDate) =>
        dueDate
          ? format.dateTime(new Date(`${dueDate}T00:00:00Z`), {
              dateStyle: "medium",
            })
          : "—",
    })

  const goalById = new Map(goals.map((goal) => [goal.id, goal]))

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
          <EmployeePortalGovernedTable
            configuration={listConfiguration}
            surfaceKey="hrm:portal:performance-goals"
            trailingColumn={{
              header: t("colAction"),
              render: (surfaceRow) => {
                const goal = goalById.get(surfaceRow.id)
                if (!goal) return null
                return (
                  <Link
                    href={goalPath(portalSlug, goal.id)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t("viewGoal")}
                  </Link>
                )
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
