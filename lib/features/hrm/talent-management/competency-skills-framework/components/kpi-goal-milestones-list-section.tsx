import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { Button } from "#components2/ui/button"

import { submitRemoveKpiGoalMilestoneAction } from "../actions/kpi-goal.actions"
import {
  buildKpiGoalMilestonesListSurfaceConfiguration,
  type KpiGoalMilestoneListRow,
} from "../data/kpi-goal-milestones-list-surface.server"
import type { ContractMutationFormState } from "../../../types"

function asVoidKpiGoalAction(
  fn: (formData: FormData) => Promise<ContractMutationFormState>
): (formData: FormData) => Promise<void> {
  return async (formData) => {
    await fn(formData)
  }
}

type KpiGoalMilestonesListSectionProps = {
  orgSlug: string
  milestones: readonly KpiGoalMilestoneListRow[]
  isHrmAdmin: boolean
}

export async function KpiGoalMilestonesListSection({
  orgSlug,
  milestones,
  isHrmAdmin,
}: KpiGoalMilestonesListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.kpi")

  const listConfiguration = buildKpiGoalMilestonesListSurfaceConfiguration(
    milestones,
    {
      empty: t("goalMilestonesEmpty"),
      colTitle: t("goalMilestoneColTitle"),
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:kpi:goal-milestones"
      trailingColumn={
        isHrmAdmin
          ? {
              header: t("goalMilestoneColActions"),
              render: (surfaceRow) => (
                <form
                  action={asVoidKpiGoalAction(
                    submitRemoveKpiGoalMilestoneAction
                  )}
                >
                  <input type="hidden" name="orgSlug" value={orgSlug} />
                  <input
                    type="hidden"
                    name="milestoneId"
                    value={surfaceRow.id}
                  />
                  <Button type="submit" variant="ghost" size="sm">
                    {t("goalMilestoneRemove")}
                  </Button>
                </form>
              ),
            }
          : undefined
      }
    />
  )
}
