import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { completeOffboardingTaskFormAction } from "../actions/offboarding.actions"
import type { OffboardingInstanceRow } from "../data/offboarding.queries.server"

type OffboardingTaskTitleKey =
  | "offboardingTaskReturnEquipment"
  | "offboardingTaskRevokeAccess"
  | "offboardingTaskFinalPayroll"
  | "offboardingTaskExitInterview"
  | "offboardingTaskUnknown"

function offboardingTaskTitleKey(taskKey: string): OffboardingTaskTitleKey {
  switch (taskKey) {
    case "return_equipment":
      return "offboardingTaskReturnEquipment"
    case "revoke_access":
      return "offboardingTaskRevokeAccess"
    case "final_payroll_review":
      return "offboardingTaskFinalPayroll"
    case "exit_interview":
      return "offboardingTaskExitInterview"
    default:
      return "offboardingTaskUnknown"
  }
}

type OffboardingPanelProps = {
  orgSlug: string
  employeeId: string
  instances: OffboardingInstanceRow[]
}

export async function OffboardingPanel({
  orgSlug,
  employeeId,
  instances,
}: OffboardingPanelProps) {
  const t = await getTranslations("Dashboard.Hrm.workforce")

  if (instances.length === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">
          {t("offboardingSectionTitle")}
        </CardTitle>
        <CardDescription>{t("offboardingSectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {instances.map((inst) => (
          <div
            key={inst.id}
            className="rounded-md border border-border p-3 text-sm"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{inst.status}</Badge>
              <span className="text-muted-foreground">
                {t("offboardingTerminationLabel", {
                  date: inst.terminationDate,
                })}
              </span>
            </div>
            <ul className="divide-y divide-border rounded-md border border-border">
              {inst.checklist.map((task) => (
                <li
                  key={`${inst.id}-${task.taskKey}`}
                  className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {t(offboardingTaskTitleKey(task.taskKey))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("offboardingAssignedRole", {
                        role: task.assignedRole,
                      })}
                      {task.completedAt
                        ? ` · ${t("offboardingCompletedAt", { at: task.completedAt })}`
                        : null}
                    </p>
                  </div>
                  {inst.status === "open" && !task.completedAt ? (
                    <form action={completeOffboardingTaskFormAction}>
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input
                        type="hidden"
                        name="employeeId"
                        value={employeeId}
                      />
                      <input type="hidden" name="instanceId" value={inst.id} />
                      <input
                        type="hidden"
                        name="taskKey"
                        value={task.taskKey}
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        {t("offboardingMarkDone")}
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
