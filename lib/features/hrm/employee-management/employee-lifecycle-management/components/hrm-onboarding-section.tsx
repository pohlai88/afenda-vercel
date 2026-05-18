import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildOnboardingListSurfaceConfiguration } from "../data/onboarding-list-surface.server"
import type { OnboardingContractRow } from "../data/onboarding.queries.server"

import { HrmOnboardingStepForm } from "./hrm-onboarding-step-form"

type HrmOnboardingSectionProps = {
  orgSlug: string
  rows: readonly OnboardingContractRow[]
  canRead: boolean
  canUpdate: boolean
}

export async function HrmOnboardingSection({
  orgSlug,
  rows,
  canRead,
  canUpdate,
}: HrmOnboardingSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.onboarding")

  const listConfiguration = buildOnboardingListSurfaceConfiguration(
    rows,
    {
      empty: t("emptyBody"),
      colEmployee: t("colEmployee"),
      colCompleted: t("colCompleted"),
      readOnlyUpdateReason: t("readOnlyUpdateReason"),
    },
    { canUpdate }
  )
  const rowById = new Map(rows.map((row) => [row.contractId, row]))
  const allowed = canRead

  return (
    <GovernedPatternCListSection
      title={rows.length === 0 && allowed ? t("emptyTitle") : t("tableTitle")}
      description={
        rows.length === 0 && allowed ? t("emptyBody") : t("tableDescription")
      }
      listConfiguration={listConfiguration}
      surfaceKey="hrm:onboarding:contracts"
      parentAccessAllowed={allowed}
      forbidden={{
        variant: "forbidden",
        title: t("forbiddenTitle"),
        description: t("forbiddenDescription"),
      }}
      invalid={{
        variant: "error",
        title: t("invalidConfigTitle"),
        description: t("invalidConfigDescription"),
      }}
      trailingColumn={{
        header: t("colRecord"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          const trailingAction = surfaceRow.trailingAction
          if (!row || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          const disabled = trailingAction.state === "disabled"
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <HrmOnboardingStepForm
                orgSlug={orgSlug}
                contractId={row.contractId}
                disabled={disabled}
                disabledReason={trailingAction.disabledReason}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
