import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { listCareerDiscussionsForOrg } from "../data/career-pathing.queries.server"
import { CareerDiscussionCreateForm } from "./career-pathing-forms.client"
import type { CareerPathingSectionProps } from "./career-pathing-section-props.shared"

export async function CareerPathingDiscussionsSection({
  organizationId,
  orgSlug,
  isHrmAdmin,
}: CareerPathingSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.careerPathing"),
    getFormatter(),
  ])

  let discussions: Awaited<ReturnType<typeof listCareerDiscussionsForOrg>>
  let employees: Awaited<ReturnType<typeof listActiveEmployeeChoicesForLeave>>

  try {
    ;[discussions, employees] = await Promise.all([
      listCareerDiscussionsForOrg(organizationId),
      listActiveEmployeeChoicesForLeave(organizationId),
    ])
  } catch (err) {
    logUnexpectedServerError("career-pathing-discussions: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("discussionsTitle")}</CardTitle>
          <CardDescription>{t("discussionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{t("discussionsLoadFailed")}</p>
        </CardContent>
      </Card>
    )
  }

  const employeeChoices = employees.map((employee) => ({
    id: employee.id,
    label: `${employee.employeeNumber} — ${employee.legalName}`,
  }))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("discussionsTitle")}</CardTitle>
        <CardDescription>{t("discussionsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isHrmAdmin ? (
          <CareerDiscussionCreateForm
            organizationId={organizationId}
            orgSlug={orgSlug}
            employees={employeeChoices}
            labels={{
              submit: t("createDiscussion"),
              employee: t("fieldEmployee"),
              date: t("fieldDiscussionDate"),
              notes: t("fieldNotes"),
            }}
          />
        ) : null}
        {discussions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("discussionsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {discussions.map((discussion) => (
              <li key={discussion.id} className="rounded-md border px-3 py-2">
                <span className="font-medium">{discussion.employeeName}</span>
                {" — "}
                {format.dateTime(new Date(discussion.discussionDate), {
                  dateStyle: "medium",
                })}
                {discussion.notes ? (
                  <p className="mt-1 text-muted-foreground">{discussion.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
