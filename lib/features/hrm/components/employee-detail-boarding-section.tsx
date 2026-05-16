import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Separator } from "#components/ui/separator"

import { listOpenBoardingInstancesForEmployee } from "../data/boarding.queries.server"

import { SignatureRequestPanel } from "./signature-request-panel"

type EmployeeDetailBoardingSectionProps = {
  orgSlug: string
  organizationId: string
  employeeId: string
}

export async function EmployeeDetailBoardingSection({
  orgSlug,
  organizationId,
  employeeId,
}: EmployeeDetailBoardingSectionProps) {
  const [t, instances] = await Promise.all([
    getTranslations("Dashboard.Hrm.boarding"),
    listOpenBoardingInstancesForEmployee(organizationId, employeeId),
  ])

  if (instances.length === 0) {
    return null
  }

  return (
    <Card id="boarding" size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("employeeSectionTitle")}</CardTitle>
        <CardDescription>{t("employeeSectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {instances.map((instance) => (
          <div key={instance.id} className="flex flex-col gap-4">
            <p className="text-sm font-medium">
              {t("instanceLabel", {
                kind: instance.kind,
                status: instance.status,
              })}
            </p>
            <ul className="flex flex-col gap-3">
              {instance.tasks
                .filter((task) => task.evidenceDocumentId)
                .map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-col gap-3 rounded-md border border-border/70 p-3"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description ? (
                        <p className="text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                    <SignatureRequestPanel
                      orgSlug={orgSlug}
                      organizationId={organizationId}
                      kind="boarding_task"
                      subjectId={task.id}
                      documentId={task.evidenceDocumentId}
                      signerEmployeeId={employeeId}
                    />
                  </li>
                ))}
            </ul>
            <Separator />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
