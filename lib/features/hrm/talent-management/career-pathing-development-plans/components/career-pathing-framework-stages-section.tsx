import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"

import { listCareerPathStagesForFramework } from "../data/career-path-framework.queries.server"
import { buildCareerPathingEmbeddedListSurfaceErrorConfiguration } from "../data/career-pathing-embedded-list-surface-error.server"
import { buildCareerPathStagesListSurfaceConfiguration } from "../data/career-pathing-list-surface.server"
import { CAREER_PATHING_LIST_SURFACE_IDS } from "../data/career-pathing-surface-metadata.shared"
import type { CareerPathFrameworkRow } from "../data/career-pathing.types.shared"
import {
  CareerPathStageCreateForm,
  CareerPathStageDeleteForm,
} from "./career-pathing-forms.client"

export async function CareerPathingFrameworkStagesSection({
  organizationId,
  orgSlug,
  framework,
}: {
  organizationId: string
  orgSlug: string
  framework: CareerPathFrameworkRow
}) {
  const t = await getTranslations("Dashboard.Hrm.careerPathing")

  let stages: Awaited<ReturnType<typeof listCareerPathStagesForFramework>>
  try {
    stages = await listCareerPathStagesForFramework(organizationId, framework.id)
  } catch (err) {
    logUnexpectedServerError("career-pathing-framework-stages: query failed", err, {
      organizationId,
      frameworkId: framework.id,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
          columnsId: CAREER_PATHING_LIST_SURFACE_IDS.frameworkStages,
          emptyTitle: t("frameworkStagesEmpty"),
          firstColumn: { id: "title", header: t("fieldStageTitle") },
        })}
        surfaceKey="hrm:career-pathing:framework-stages:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("frameworkStagesLoadFailed"),
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <p className="text-sm font-medium">
        {t("frameworkStagesTitle")}: {framework.name}
      </p>
      <CareerPathStageCreateForm
        organizationId={organizationId}
        orgSlug={orgSlug}
        frameworkId={framework.id}
        labels={{
          submit: t("createStage"),
          title: t("fieldStageTitle"),
          grade: t("fieldStageGrade"),
          months: t("fieldStageMonths"),
        }}
      />
      <GovernedPatternCListSection
        title={t("frameworkStagesTitle")}
        description={t("frameworkStagesDescription")}
        listConfiguration={buildCareerPathStagesListSurfaceConfiguration(stages, {
          title: t("frameworkStagesTitle"),
          description: t("frameworkStagesDescription"),
          empty: t("frameworkStagesEmpty"),
          colSequence: t("colSequence"),
          colTitle: t("fieldStageTitle"),
          colGrade: t("fieldStageGrade"),
          colMonths: t("fieldStageMonths"),
        })}
        surfaceKey="hrm:career-pathing:framework-stages"
        layout="embedded"
        resolveConfiguredPermission={false}
        trailingColumn={{
          header: "",
          render: (surfaceRow) => {
            if (!isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)) {
              return null
            }
            return (
              <GovernedTrailingActionSlot trailingAction={surfaceRow.trailingAction}>
                <CareerPathStageDeleteForm
                  organizationId={organizationId}
                  orgSlug={orgSlug}
                  stageId={surfaceRow.id}
                  label={t("deleteStage")}
                />
              </GovernedTrailingActionSlot>
            )
          },
        }}
      />
    </div>
  )
}
