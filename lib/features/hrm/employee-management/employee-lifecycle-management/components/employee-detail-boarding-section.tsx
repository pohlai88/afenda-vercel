import { getTranslations } from "next-intl/server"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Separator } from "#components2/ui/separator"
import { logUnexpectedServerError } from "#lib/logger.server"

import { listOpenBoardingInstancesForEmployee } from "../data/boarding.queries.server"

import { SignatureRequestPanel } from "#features/tools"
import { BoardingTaskActions } from "./boarding-task-actions.client"

type EmployeeDetailBoardingSectionProps = {
  orgSlug: string
  organizationId: string
  employeeId: string
  canManageTasks: boolean
}

export async function EmployeeDetailBoardingSection({
  orgSlug,
  organizationId,
  employeeId,
  canManageTasks,
}: EmployeeDetailBoardingSectionProps) {
  const [t, instancesResult] = await Promise.all([
    getTranslations("Dashboard.Hrm.boarding"),
    (async (): Promise<
      | {
          ok: true
          instances: Awaited<
            ReturnType<typeof listOpenBoardingInstancesForEmployee>
          >
        }
      | { ok: false; error: unknown }
    > => {
      try {
        const instances = await listOpenBoardingInstancesForEmployee(
          organizationId,
          employeeId
        )
        return { ok: true, instances }
      } catch (error) {
        return { ok: false, error }
      }
    })(),
  ])

  const copy = (
    key: string,
    values?: Record<string, string | number>
  ): string => t(key as never, values as never)

  if (!instancesResult.ok) {
    logUnexpectedServerError(
      "employee-detail-boarding-section: query failed",
      instancesResult.error,
      { organizationId, employeeId }
    )
    return (
      <Card id="boarding" size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {copy("employeeSectionTitle")}
          </CardTitle>
          <CardDescription>
            {copy("employeeSectionDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{copy("errorTitle")}</AlertTitle>
            <AlertDescription>{copy("sectionLoadFailed")}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const instances = instancesResult.instances

  if (instances.length === 0) {
    return null
  }

  return (
    <Card id="boarding" size="sm">
      <CardHeader>
        <CardTitle className="text-base">
          {copy("employeeSectionTitle")}
        </CardTitle>
        <CardDescription>{copy("employeeSectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {instances.map((instance) => (
          <div key={instance.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                {copy("instanceLabel", {
                  kind: instance.kind,
                  status: instance.status,
                })}
              </p>
              <Badge variant="outline">
                {copy("instanceProgress", {
                  completed: instance.completedRequiredTaskCount,
                  total: instance.requiredTaskCount,
                })}
              </Badge>
            </div>
            <ul className="flex flex-col gap-3">
              {instance.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-col gap-3 rounded-md border border-border/70 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{task.title}</p>
                      {task.description ? (
                        <p className="text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="secondary">{task.status}</Badge>
                  </div>
                  {canManageTasks ? (
                    <BoardingTaskActions
                      orgSlug={orgSlug}
                      taskId={task.id}
                      status={task.status}
                    />
                  ) : null}
                  {task.evidenceDocumentId ? (
                    <SignatureRequestPanel
                      orgSlug={orgSlug}
                      organizationId={organizationId}
                      kind="boarding_task"
                      subjectId={task.id}
                      documentId={task.evidenceDocumentId}
                      signerEmployeeId={employeeId}
                    />
                  ) : null}
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
