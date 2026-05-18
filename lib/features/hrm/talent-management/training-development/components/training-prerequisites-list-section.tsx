import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildTrainingPrerequisitesListSurfaceConfiguration } from "../data/training-prerequisites-list-surface.server"
import type { TrainingPrerequisiteRow } from "../data/training-prerequisite.server"

import { TrainingPrerequisiteRemoveButton } from "./training-prerequisite-remove-button.client"

type TrainingPrerequisitesListSectionProps = {
  prerequisites: readonly TrainingPrerequisiteRow[]
  courseNameById: Readonly<Record<string, string>>
  organizationId: string
  orgSlug: string
  isHrmAdmin: boolean
  removeAction: (formData: FormData) => void | Promise<void>
}

export async function TrainingPrerequisitesListSection({
  prerequisites,
  courseNameById,
  organizationId,
  orgSlug,
  isHrmAdmin,
  removeAction,
}: TrainingPrerequisitesListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.training")
  const prerequisiteById = new Map(prerequisites.map((row) => [row.id, row]))

  const listConfiguration = buildTrainingPrerequisitesListSurfaceConfiguration(
    prerequisites,
    {
      empty: t("prerequisiteEmpty"),
      colCourse: t("prerequisiteColCourse"),
      colRequires: t("prerequisiteColRequires"),
      colRequired: t("prerequisiteColRequired"),
      requiredLabel: t("prerequisiteRequired"),
      optionalLabel: t("prerequisiteOptional"),
      courseLabelFor: (courseId) => courseNameById[courseId] ?? courseId,
    },
    { showTrailing: isHrmAdmin }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:training:prerequisites"
      trailingColumn={
        isHrmAdmin
          ? {
              header: "",
              render: (surfaceRow) => {
                const prereq = prerequisiteById.get(surfaceRow.id)
                const trailingAction = surfaceRow.trailingAction
                if (
                  !prereq ||
                  !isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <TrainingPrerequisiteRemoveButton
                      organizationId={organizationId}
                      orgSlug={orgSlug}
                      prerequisiteId={prereq.id}
                      removeAction={removeAction}
                      label={t("prerequisiteRemove")}
                    />
                  </GovernedTrailingActionSlot>
                )
              },
            }
          : undefined
      }
    />
  )
}
