import { getTranslations } from "next-intl/server"

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

import { getTrainingAnalyticsSummary } from "../data/training-analytics.queries.server"

type TrainingAnalyticsPanelProps = {
  readonly organizationId: string
}

export async function TrainingAnalyticsPanel({
  organizationId,
}: TrainingAnalyticsPanelProps) {
  const [t, summary] = await Promise.all([
    getTranslations("Dashboard.Hrm.training"),
    getTrainingAnalyticsSummary(organizationId),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("analyticsTitle")}</CardTitle>
        <CardDescription>{t("analyticsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">
              {t("analyticsOpenAssignments")}
            </dt>
            <dd className="text-lg font-semibold">{summary.openAssignments}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("analyticsTotalRecords")}
            </dt>
            <dd className="text-lg font-semibold">{summary.totalRecords}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {t("analyticsExpiring90")}
            </dt>
            <dd className="text-lg font-semibold">
              {summary.expiringWithin90Days}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("analyticsTotalCost")}</dt>
            <dd className="text-lg font-semibold">
              {summary.totalCostAmount ?? "—"}
            </dd>
          </div>
        </dl>

        {summary.courseStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("analyticsCoursesEmpty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colCourse")}</TableHead>
                <TableHead>{t("analyticsCompletionRate")}</TableHead>
                <TableHead>{t("analyticsAssignments")}</TableHead>
                <TableHead>{t("analyticsCompletions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.courseStats.map((row) => (
                <TableRow key={row.courseId}>
                  <TableCell>
                    <span className="font-mono text-xs">{row.courseCode}</span>{" "}
                    {row.courseName}
                  </TableCell>
                  <TableCell>{row.completionRate}%</TableCell>
                  <TableCell>{row.assignmentCount}</TableCell>
                  <TableCell>{row.completedCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
