import { getFormatter, getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  listTrainingAssignmentsForOrg,
  listTrainingRecordsForOrg,
} from "../../../talent-management/training-development/data/training.queries.server"
import { submitPortalSelfAttestTraining } from "../actions/training-portal.actions"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import {
  buildEmployeePortalTrainingDueListSurfaceConfiguration,
  buildEmployeePortalTrainingHistoryListSurfaceConfiguration,
} from "../data/employee-portal-list-surface.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
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

  const trailingContext = { showRowActions: true } as const

  const dueConfiguration =
    buildEmployeePortalTrainingDueListSurfaceConfiguration(
      assignments,
      {
        empty: t("portalDueEmpty"),
        colCourse: t("colCourse"),
        colDue: t("colDue"),
        colState: t("colState"),
        formatDue: (value) =>
          value ? format.dateTime(value, { dateStyle: "medium" }) : "—",
      },
      trailingContext
    )

  const assignmentById = new Map(assignments.map((row) => [row.id, row]))
  const recordById = new Map(records.map((row) => [row.id, row]))

  const historyConfiguration =
    buildEmployeePortalTrainingHistoryListSurfaceConfiguration(
      records,
      {
        empty: t("portalHistoryEmpty"),
        colCourse: t("colCourse"),
        colCompleted: t("colCompleted"),
        colVerification: t("colState"),
        colFeedback: t("portalFeedbackRating"),
        formatCompleted: (value) =>
          format.dateTime(value, { dateStyle: "medium" }),
        feedbackGivenLabel: (rating) => t("portalFeedbackGiven", { rating }),
      },
      trailingContext
    )

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
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={dueConfiguration}
            surfaceKey="hrm:portal:training-due"
            resolveConfiguredPermission={false}
            trailingColumn={{
              header: " ",
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = assignmentById.get(surfaceRow.id)
                if (
                  !row ||
                  !isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <form
                      action={submitPortalSelfAttestTraining}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input
                        type="hidden"
                        name="portalSlug"
                        value={portalSlug}
                      />
                      <input type="hidden" name="assignmentId" value={row.id} />
                      <input
                        type="hidden"
                        name="courseId"
                        value={row.courseId}
                      />
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
                  </GovernedTrailingActionSlot>
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
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={historyConfiguration}
            surfaceKey="hrm:portal:training-history"
            resolveConfiguredPermission={false}
            trailingColumn={{
              header: " ",
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const record = recordById.get(surfaceRow.id)
                if (
                  !record ||
                  record.feedbackRating ||
                  !isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <EmployeePortalTrainingFeedbackForm
                      portalSlug={portalSlug}
                      organizationId={organizationId}
                      recordId={record.id}
                      courseName={record.courseName}
                    />
                  </GovernedTrailingActionSlot>
                )
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
