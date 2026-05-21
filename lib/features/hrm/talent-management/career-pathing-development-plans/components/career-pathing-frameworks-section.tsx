import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { listCareerPathFrameworksForOrg } from "../data/career-path-framework.queries.server"
import { buildCareerPathingEmbeddedListSurfaceErrorConfiguration } from "../data/career-pathing-embedded-list-surface-error.server"
import { buildCareerPathFrameworksListSurfaceConfiguration } from "../data/career-pathing-list-surface.server"
import { resolveCareerPathingSelectedId } from "../data/career-pathing-selection.shared"
import { CAREER_PATHING_LIST_SURFACE_IDS } from "../data/career-pathing-surface-metadata.shared"
import type { CareerPathingSectionProps } from "./career-pathing-section-props.shared"
import {
  CareerPathFrameworkCreateForm,
  FrameworkStatusUpdateForm,
} from "./career-pathing-forms.client"
import { CareerPathingFrameworkStagesSection } from "./career-pathing-framework-stages-section"
import { CareerPathingFrameworkPicker } from "./career-pathing-query-pickers.client"

export async function CareerPathingFrameworksSection({
  organizationId,
  orgSlug,
  isHrmAdmin,
  selectedFrameworkId,
}: CareerPathingSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.careerPathing")

  let frameworks: Awaited<ReturnType<typeof listCareerPathFrameworksForOrg>>
  try {
    frameworks = await listCareerPathFrameworksForOrg(organizationId)
  } catch (err) {
    logUnexpectedServerError("career-pathing-frameworks: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("frameworksTitle")}</CardTitle>
          <CardDescription>{t("frameworksDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
              columnsId: CAREER_PATHING_LIST_SURFACE_IDS.frameworks,
              emptyTitle: t("frameworksEmpty"),
              firstColumn: { id: "name", header: t("colName") },
            })}
            surfaceKey="hrm:career-pathing:frameworks:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("frameworksLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const frameworkPickerOptions = frameworks.map((framework) => ({
    id: framework.id,
    label: `${framework.code} — ${framework.name}`,
  }))

  const activeFrameworkId = resolveCareerPathingSelectedId(
    frameworks,
    selectedFrameworkId
  )
  const activeFramework = frameworks.find((row) => row.id === activeFrameworkId)

  const listConfiguration = buildCareerPathFrameworksListSurfaceConfiguration(
    frameworks,
    {
      title: t("frameworksTitle"),
      description: t("frameworksDescription"),
      empty: t("frameworksEmpty"),
      colCode: t("colCode"),
      colName: t("colName"),
      colKind: t("colKind"),
      colStatus: t("colStatus"),
      colStages: t("colStages"),
    }
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("frameworksTitle")}</CardTitle>
        <CardDescription>{t("frameworksDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isHrmAdmin ? (
          <CareerPathFrameworkCreateForm
            organizationId={organizationId}
            orgSlug={orgSlug}
            labels={{
              submit: t("createFramework"),
              code: t("fieldCode"),
              name: t("fieldName"),
              kind: t("colKind"),
            }}
          />
        ) : null}
        <GovernedPatternCListSection
          title={t("frameworksTitle")}
          description={t("frameworksDescription")}
          listConfiguration={listConfiguration}
          surfaceKey="hrm:career-pathing:frameworks"
          layout="embedded"
          resolveConfiguredPermission={false}
          trailingColumn={
            isHrmAdmin
              ? {
                  header: "",
                  render: (surfaceRow) => {
                    if (
                      !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
                    ) {
                      return null
                    }
                    const framework = frameworks.find((row) => row.id === surfaceRow.id)
                    if (!framework) return null
                    return (
                      <GovernedTrailingActionSlot
                        trailingAction={surfaceRow.trailingAction}
                      >
                        <FrameworkStatusUpdateForm
                          organizationId={organizationId}
                          orgSlug={orgSlug}
                          frameworkId={framework.id}
                          currentStatus={
                            framework.status as "draft" | "active" | "archived"
                          }
                          labels={{
                            activate: t("activateFramework"),
                            archive: t("archiveFramework"),
                            restoreDraft: t("restoreFrameworkDraft"),
                          }}
                        />
                      </GovernedTrailingActionSlot>
                    )
                  },
                }
              : undefined
          }
        />
        {isHrmAdmin && frameworks.length > 0 ? (
          <>
            <Suspense fallback={null}>
              <CareerPathingFrameworkPicker
                frameworks={frameworkPickerOptions}
                selectedFrameworkId={activeFrameworkId}
                label={t("selectFramework")}
              />
            </Suspense>
            {activeFramework ? (
              <CareerPathingFrameworkStagesSection
                organizationId={organizationId}
                orgSlug={orgSlug}
                framework={activeFramework}
              />
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
