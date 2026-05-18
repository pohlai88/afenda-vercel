import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildBenefitPlansListSurfaceConfiguration } from "../data/benefit-list-surface.server"
import type { BenefitPlanRow } from "../data/benefit-model.shared"

import { BenefitArchivePlanForm } from "./benefit-archive-plan-form"
import { BenefitPlanCreateDialog } from "./benefit-plan-create-dialog"
import { BenefitPlanEditDialog } from "./benefit-plan-edit-dialog"
import type { BenefitProviderChoice } from "./benefit-plan-form"

type BenefitPlansSectionProps = {
  isAdmin: boolean
  plans: readonly BenefitPlanRow[]
  providers?: readonly BenefitProviderChoice[]
}

export async function BenefitPlansSection({
  isAdmin,
  plans,
  providers = [],
}: BenefitPlansSectionProps) {
  const [tSection, t] = await Promise.all([
    getTranslations("Dashboard.Hrm.benefits"),
    getTranslations("Dashboard.Hrm.benefits.plansTable"),
  ])

  const listConfiguration = buildBenefitPlansListSurfaceConfiguration(plans, {
    empty: isAdmin ? t("emptyAdmin") : t("emptyMember"),
    colCode: t("colCode"),
    colName: t("colName"),
    colKind: t("colKind"),
    colEffective: t("colEffective"),
    colStatus: t("colStatus"),
    statusActive: t("statusActive"),
    statusInactive: t("statusInactive"),
  })

  const planById = new Map(plans.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={tSection("tabPlansTitle")}
      description={tSection("tabPlansDescription")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:benefits:plans"
      cardClassName="mt-0 border-solid border-border"
      headerSlot={
        isAdmin ? (
          <div className="mb-3 flex justify-end">
            <BenefitPlanCreateDialog providers={providers} />
          </div>
        ) : null
      }
      trailingColumn={
        isAdmin
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const plan = planById.get(surfaceRow.id)
                if (!plan) return null
                return (
                  <div className="flex flex-wrap justify-end gap-2">
                    <BenefitPlanEditDialog plan={plan} providers={providers} />
                    {plan.isActive ? (
                      <BenefitArchivePlanForm
                        planId={plan.id}
                        planLabel={plan.name}
                      />
                    ) : null}
                  </div>
                )
              },
            }
          : undefined
      }
    />
  )
}
