import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { employeePortalPath } from "#lib/portal"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { listKpiGoalsVisibleToEmployee } from "../data/employee-portal-kpi.queries.server"

type EmployeePortalPerformanceGoalPageProps = {
  portalSlug: string
  goalId: string
}

export async function EmployeePortalPerformanceGoalPage({
  portalSlug,
  goalId,
}: EmployeePortalPerformanceGoalPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const [t, format, goals] = await Promise.all([
    getTranslations("Dashboard.Hrm.portalPerformance"),
    getFormatter(),
    listKpiGoalsVisibleToEmployee({
      organizationId: context.portal.organizationId,
      employeeId: context.employee.id,
    }),
  ])

  const goal = goals.find((row) => row.id === goalId)
  if (!goal) notFound()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <Link
          href={employeePortalPath(portalSlug, "performance")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("backToGoals")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{goal.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{goal.status}</Badge>
          <span className="text-sm text-muted-foreground">
            {t("progressLabel", { percent: goal.percentComplete ?? 0 })}
          </span>
        </div>
      </header>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("detailTitle")}</CardTitle>
          <CardDescription>{t("detailDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {goal.description ? (
            <p className="text-muted-foreground">{goal.description}</p>
          ) : null}
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t("ownerLabel")}</dt>
              <dd>{goal.ownerLegalName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("dueLabel")}</dt>
              <dd>
                {goal.dueDate
                  ? format.dateTime(new Date(`${goal.dueDate}T00:00:00Z`), {
                      dateStyle: "medium",
                    })
                  : "ÔÇö"}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">{t("readOnlyHint")}</p>
        </CardContent>
      </Card>
    </div>
  )
}
