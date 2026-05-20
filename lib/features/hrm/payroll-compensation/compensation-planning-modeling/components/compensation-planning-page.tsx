import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"

import { HrmShellAccessDeniedFromNav } from "#features/hrm/components/hrm-shell-access-denied.server"

import type { CompensationPlanningSurfaceAccess } from "../data/cpm-access.server"
import { loadCompensationPlanningPageData } from "../data/cpm.queries.server"
import {
  CompensationBudgetPoolsSection,
  CompensationCyclesSection,
  CompensationParticipantsSection,
} from "./cpm-sections"

type CompensationPlanningPageProps = {
  access?: CompensationPlanningSurfaceAccess
  organizationId?: string
}

export async function CompensationPlanningPage({
  access,
  organizationId: organizationIdProp,
}: CompensationPlanningPageProps) {
  const t = await getTranslations("Dashboard.Hrm.compensationPlanning")

  if (access && !access.canEnter) {
    return <HrmShellAccessDeniedFromNav navKey="compensation-planning" />
  }

  if (!organizationIdProp) {
    return <HrmShellAccessDeniedFromNav navKey="compensation-planning" />
  }

  const { cycles, primaryCycleId, budgetPools, participants } =
    await loadCompensationPlanningPageData(organizationIdProp)

  const canManage = access?.canManage ?? false

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
      <CompensationCyclesSection cycles={cycles} canManage={canManage} />
      <CompensationBudgetPoolsSection
        cycleId={primaryCycleId}
        pools={budgetPools}
        canManage={canManage}
      />
      <CompensationParticipantsSection
        cycleId={primaryCycleId}
        participants={participants}
        canManage={canManage}
      />
    </div>
  )
}
