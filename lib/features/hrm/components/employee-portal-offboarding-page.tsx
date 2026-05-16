import { getFormatter, getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { listOpenOffboardingForEmployee } from "../data/offboarding.queries.server"

import { EmployeePortalOffboardingTaskButton } from "./employee-portal-offboarding-task-button"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalOffboardingPageProps = {
  portalSlug: string
}

export async function EmployeePortalOffboardingPage({
  portalSlug,
}: EmployeePortalOffboardingPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const [t, navLabels, format, instances] = await Promise.all([
    getTranslations("Dashboard.Hrm.portalOffboarding"),
    getEmployeePortalSectionNavLabels(),
    getFormatter(),
    listOpenOffboardingForEmployee(
      context.portal.organizationId,
      context.employee.id
    ),
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
        current="offboarding"
        labels={navLabels}
      />

      {instances.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("emptyTitle")}</CardTitle>
            <CardDescription>{t("emptyDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        instances.map((instance) => (
          <Card key={instance.id} size="sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {t("checklistTitle")}
                </CardTitle>
                <Badge variant="outline">{instance.status}</Badge>
              </div>
              <CardDescription>
                {t("terminationDate", {
                  date: format.dateTime(
                    new Date(`${instance.terminationDate}T00:00:00Z`),
                    { dateStyle: "medium" }
                  ),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {instance.checklist.map((task) => {
                  const completed = Boolean(task.completedAt)
                  const taskLabel = t(
                    `tasks.${task.taskKey}` as "tasks.return_equipment"
                  )
                  return (
                    <li
                      key={task.taskKey}
                      className="flex flex-col gap-2 rounded-md border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{taskLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("assignedRole", { role: task.assignedRole })}
                        </p>
                      </div>
                      <EmployeePortalOffboardingTaskButton
                        portalSlug={portalSlug}
                        instanceId={instance.id}
                        taskKey={task.taskKey}
                        disabled={completed}
                      />
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
