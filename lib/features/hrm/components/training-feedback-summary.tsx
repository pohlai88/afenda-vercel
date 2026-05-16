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

import { listTrainingFeedbackAggregatesForOrg } from "../data/training-analytics.queries.server"

type TrainingFeedbackSummaryProps = {
  readonly organizationId: string
}

export async function TrainingFeedbackSummary({
  organizationId,
}: TrainingFeedbackSummaryProps) {
  const [t, rows] = await Promise.all([
    getTranslations("Dashboard.Hrm.training"),
    listTrainingFeedbackAggregatesForOrg(organizationId),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("feedbackSummaryTitle")}</CardTitle>
        <CardDescription>{t("feedbackSummaryDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("feedbackSummaryEmpty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colCourse")}</TableHead>
                <TableHead>{t("feedbackSummaryCount")}</TableHead>
                <TableHead>{t("feedbackSummaryAverage")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.courseId}>
                  <TableCell>
                    <span className="font-mono text-xs">{row.courseCode}</span>{" "}
                    {row.courseName}
                  </TableCell>
                  <TableCell>{row.feedbackCount}</TableCell>
                  <TableCell>
                    {row.averageRating !== null
                      ? `${row.averageRating}/5`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
