import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  GovernedPatternCListSection,
  GovernedSurfaceSectionCard,
} from "#features/governed-surface"

import { completeOffboardingTaskFormAction } from "../actions/offboarding.actions"
import { buildOffboardingChecklistListSurfaceConfiguration } from "../data/offboarding-list-surface.server"
import type { OffboardingInstanceRow } from "../data/offboarding.queries.server"

type OffboardingPanelProps = {
  orgSlug: string
  employeeId: string
  instances: OffboardingInstanceRow[]
  canCompleteTasks?: boolean
}

export async function OffboardingPanel({
  orgSlug,
  employeeId,
  instances,
  canCompleteTasks = true,
}: OffboardingPanelProps) {
  const t = await getTranslations("Dashboard.Hrm.workforce")

  if (instances.length === 0) {
    return null
  }

  const checklistCopy = {
    title: t("offboardingChecklistTitle"),
    description: t("offboardingChecklistDescription"),
    empty: t("offboardingChecklistEmpty"),
    colTask: t("offboardingColTask"),
    colOwner: t("offboardingColOwner"),
    colStatus: t("offboardingColStatus"),
    colDue: t("offboardingColDue"),
    colCompleted: t("offboardingColCompleted"),
    emptyValue: t("offboardingEmptyValue"),
    pendingStatus: t("offboardingPendingStatus"),
  }

  return (
    <GovernedSurfaceSectionCard
      title={t("offboardingSectionTitle")}
      description={t("offboardingSectionDescription")}
      className="mt-0"
      body={{
        state: "ready",
        children: (
          <div className="flex flex-col gap-4">
            {instances.map((inst) => {
              const listConfiguration =
                buildOffboardingChecklistListSurfaceConfiguration(
                  inst.checklist,
                  checklistCopy
                )
              const taskByKey = new Map(
                inst.checklist.map((task) => [task.taskKey, task])
              )
              const tasksComplete =
                inst.status === "completed" || inst.status === "cancelled"

              return (
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
                  <GovernedPatternCListSection
                    layout="embedded"
                    title=""
                    listConfiguration={listConfiguration}
                    surfaceKey={`hrm:offboarding:checklist:${inst.id}`}
                    invalid={{
                      variant: "error",
                      title: t("offboardingChecklistLoadFailed"),
                    }}
                    trailingColumn={
                      canCompleteTasks && !tasksComplete
                        ? {
                            header: t("offboardingColActions"),
                            render: (surfaceRow) => {
                              const task = taskByKey.get(surfaceRow.id)
                              if (!task || task.completedAt) {
                                return null
                              }
                              return (
                                <form
                                  action={completeOffboardingTaskFormAction}
                                >
                                  <input
                                    type="hidden"
                                    name="orgSlug"
                                    value={orgSlug}
                                  />
                                  <input
                                    type="hidden"
                                    name="employeeId"
                                    value={employeeId}
                                  />
                                  <input
                                    type="hidden"
                                    name="instanceId"
                                    value={inst.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="taskKey"
                                    value={task.taskKey}
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="secondary"
                                  >
                                    {t("offboardingMarkDone")}
                                  </Button>
                                </form>
                              )
                            },
                          }
                        : undefined
                    }
                  />
                </div>
              )
            })}
          </div>
        ),
      }}
    />
  )
}
