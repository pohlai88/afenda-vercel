import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { getTrainingAnalyticsSummary } from "../data/training-analytics.queries.server"
import { buildTrainingAnalyticsCourseListSurfaceConfiguration } from "../data/training-list-surface.server"

type TrainingAnalyticsSectionProps = {
  readonly organizationId: string
}

export async function TrainingAnalyticsSection({
  organizationId,
}: TrainingAnalyticsSectionProps) {
  const [t, summary] = await Promise.all([
    getTranslations("Dashboard.Hrm.training"),
    getTrainingAnalyticsSummary(organizationId),
  ])

  const listConfiguration =
    buildTrainingAnalyticsCourseListSurfaceConfiguration(summary.courseStats, {
      empty: t("analyticsCoursesEmpty"),
      colCourse: t("colCourse"),
      colCompletionRate: t("analyticsCompletionRate"),
      colAssignments: t("analyticsAssignments"),
      colCompletions: t("analyticsCompletions"),
    })

  const statsStrip = (
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-muted-foreground">
          {t("analyticsOpenAssignments")}
        </dt>
        <dd className="text-headline-small font-semibold">
          {summary.openAssignments}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t("analyticsTotalRecords")}</dt>
        <dd className="text-headline-small font-semibold">
          {summary.totalRecords}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t("analyticsExpiring90")}</dt>
        <dd className="text-headline-small font-semibold">
          {summary.expiringWithin90Days}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t("analyticsTotalCost")}</dt>
        <dd className="text-headline-small font-semibold">
          {summary.totalCostAmount ?? "—"}
        </dd>
      </div>
    </dl>
  )

  return (
    <GovernedPatternCListSection
      title={t("analyticsTitle")}
      description={t("analyticsDescription")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:training:analytics-courses"
      cardClassName="mt-0"
      contentClassName="flex flex-col gap-4"
      contentBeforeList={statsStrip}
    />
  )
}
