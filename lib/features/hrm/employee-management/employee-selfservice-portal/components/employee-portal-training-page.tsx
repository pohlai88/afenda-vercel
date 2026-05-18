import { getFormatter, getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedEmpty } from "#features/governed-surface"

import {
  listTrainingAssignmentsForOrg,
  listTrainingRecordsForOrg,
} from "../../../talent-management/training-development/data/training.queries.server"
import { submitPortalSelfAttestTraining } from "../actions/training-portal.actions"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { buildEmployeePortalTrainingDueListSurfaceConfiguration } from "../data/employee-portal-list-surface.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalGovernedTable } from "./employee-portal-governed-table"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"
import { EmployeePortalTrainingFeedbackForm } from "./employee-portal-training-feedback-form"

type EmployeePortalTrainingPageProps = {
  portalSlug: string
}

export async function EmployeePortalTrainingPage({
  portalSlug,
}: EmployeePortalTrainingPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const [t, navLabels, format, assignments, records] = await Promise.all([
    getTranslations("Dashboard.Hrm.training"),
    getEmployeePortalSectionNavLabels(),
    getFormatter(),
    listTrainingAssignmentsForOrg(organizationId, {
      employeeId,
      states: ["assigned", "overdue"],
    }),
    listTrainingRecordsForOrg(organizationId, { employeeId }),
  ])

  const today = new Date().toISOString().slice(0, 10)

  const dueConfiguration = buildEmployeePortalTrainingDueListSurfaceConfiguration(
    assignments,
    {
      empty: t("portalDueEmpty"),
      colCourse: t("colCourse"),
      colDue: t("colDue"),
      colState: t("colState"),
      formatDue: (value) =>
        value
          ? format.dateTime(value, { dateStyle: "medium" })
          : "—",
    }
  )

  const assignmentById = new Map(assignments.map((row) => [row.id, row]))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("portalEyebrow", {
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
        current="training"
        labels={navLabels}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("portalDueTitle")}</CardTitle>
          <CardDescription>{t("portalDueDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeePortalGovernedTable
            configuration={dueConfiguration}
            surfaceKey="hrm:portal:training-due"
            trailingColumn={{
              header: " ",
              render: (surfaceRow) => {
                const row = assignmentById.get(surfaceRow.id)
                if (!row) return null
                return (
                  <form
                    action={submitPortalSelfAttestTraining}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="portalSlug" value={portalSlug} />
                    <input
                      type="hidden"
                      name="assignmentId"
                      value={row.id}
                    />
                    <input type="hidden" name="courseId" value={row.courseId} />
                    <input
                      type="hidden"
                      name="sessionId"
                      value={row.sessionId ?? ""}
                    />
                    <input type="hidden" name="completedAt" value={today} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t("portalAttest")}
                    </button>
                  </form>
                )
              },
            }}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("portalHistoryTitle")}</CardTitle>
          <CardDescription>{t("portalHistoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <GovernedEmpty
              model={{
                variant: "muted",
                title: t("portalHistoryEmpty"),
              }}
            />
          ) : (
            <ul className="divide-y rounded-md border text-sm">
              {records.map((record) => (
                <li key={record.id} className="px-4 py-3">
                  <p className="font-medium">{record.courseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format.dateTime(record.completedAt, {
                      dateStyle: "medium",
                    })}
                    {" · "}
                    {record.verificationState}
                    {record.feedbackRating
                      ? ` · ${t("portalFeedbackGiven", { rating: record.feedbackRating })}`
                      : null}
                  </p>
                  {!record.feedbackRating ? (
                    <EmployeePortalTrainingFeedbackForm
                      portalSlug={portalSlug}
                      organizationId={organizationId}
                      recordId={record.id}
                      courseName={record.courseName}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
