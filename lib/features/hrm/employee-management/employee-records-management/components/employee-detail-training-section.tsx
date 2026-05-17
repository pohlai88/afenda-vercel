import { getFormatter, getTranslations } from "next-intl/server"

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

import { listEmployeeSkillsForEmployee } from "../../../talent-management/competency-skills-framework/data/skill.queries.server"
import {
  listTrainingAssignmentsForOrg,
  listTrainingRecordsForOrg,
} from "../../../talent-management/training-development/data/training.queries.server"

type EmployeeDetailTrainingSectionProps = {
  readonly organizationId: string
  readonly employeeId: string
}

export async function EmployeeDetailTrainingSection({
  organizationId,
  employeeId,
}: EmployeeDetailTrainingSectionProps) {
  const [t, format, assignments, records, skills] = await Promise.all([
    getTranslations("Dashboard.Hrm.training"),
    getFormatter(),
    listTrainingAssignmentsForOrg(organizationId, {
      employeeId,
      states: ["assigned", "overdue"],
    }),
    listTrainingRecordsForOrg(organizationId, { employeeId }),
    listEmployeeSkillsForEmployee(organizationId, employeeId),
  ])

  return (
    <Card id="training" size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("employeeDetailTitle")}</CardTitle>
        <CardDescription>{t("employeeDetailDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("employeeDetailUpcoming")}</h3>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("employeeDetailUpcomingEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colCourse")}</TableHead>
                  <TableHead>{t("colDue")}</TableHead>
                  <TableHead>{t("colState")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell>
                      {row.dueAt
                        ? format.dateTime(row.dueAt, { dateStyle: "medium" })
                        : "—"}
                    </TableCell>
                    <TableCell>{row.state}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("employeeDetailHistory")}</h3>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("employeeDetailHistoryEmpty")}
            </p>
          ) : (
            <ul className="divide-y rounded-md border text-sm">
              {records.map((record) => (
                <li key={record.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{record.courseName}</p>
                    <Badge variant="outline">{record.verificationState}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format.dateTime(record.completedAt, {
                      dateStyle: "medium",
                    })}
                    {record.expiresAt
                      ? ` · ${t("expires")} ${format.dateTime(record.expiresAt, { dateStyle: "medium" })}`
                      : null}
                    {record.feedbackRating
                      ? ` · ${t("employeeDetailFeedback", { rating: record.feedbackRating })}`
                      : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {skills.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t("employeeDetailSkills")}</h3>
            <ul className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill.skillId} variant="secondary">
                  {skill.skillLabel} ({skill.proficiency}/5)
                </Badge>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
