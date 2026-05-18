import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildBenefitOpenEnrollmentListSurfaceConfiguration } from "../data/benefit-list-surface.server"
import type { BenefitOpenEnrollmentRow } from "../data/benefit-model.shared"

import { BenefitOpenEnrollmentCloseButton } from "./benefit-open-enrollment-close-button.client"

type BenefitOpenEnrollmentWindowsSectionProps = {
  isAdmin: boolean
  windows: readonly BenefitOpenEnrollmentRow[]
}

export async function BenefitOpenEnrollmentWindowsSection({
  isAdmin,
  windows,
}: BenefitOpenEnrollmentWindowsSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.benefits")
  const windowById = new Map(windows.map((row) => [row.id, row]))

  const listConfiguration = buildBenefitOpenEnrollmentListSurfaceConfiguration(
    windows,
    {
      empty: t("openEnrollment.empty"),
      colName: t("openEnrollment.colName"),
      colPeriod: t("openEnrollment.colPeriod"),
      colPlans: t("openEnrollment.colPlans"),
      colStatus: t("openEnrollment.colStatus"),
      activeLabel: t("openEnrollment.statusActive"),
      closedLabel: t("openEnrollment.statusClosed"),
      allPlansLabel: t("openEnrollment.allPlans"),
    },
    { showTrailing: isAdmin }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:benefits:open-enrollment"
      trailingColumn={
        isAdmin
          ? {
              header: t("openEnrollment.colActions"),
              render: (surfaceRow) => {
                const window = windowById.get(surfaceRow.id)
                const trailingAction = surfaceRow.trailingAction
                if (
                  !window?.isActive ||
                  !isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <BenefitOpenEnrollmentCloseButton windowId={window.id} />
                  </GovernedTrailingActionSlot>
                )
              },
            }
          : undefined
      }
    />
  )
}
