import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { listSkillsForOrg } from "../../../talent-management/competency-skills-framework/data/skill.queries.server"
import { listTrainingCoursesForOrg } from "../../../talent-management/training-development/data/training.queries.server"
import { listPositionsForOrg } from "../../../employee-management/organizational-chart-hierarchy/data/org-structure.queries.server"
import { compareCoverageHeadcount } from "../data/sft-coverage.server"
import { buildSftEmbeddedListSurfaceErrorConfiguration } from "../data/sft-embedded-list-surface-error.server"
import { buildSftCoverageListSurfaceConfiguration } from "../data/sft-surface-builders.server"
import { listAllShiftTemplatesForOrg } from "../data/sft-template.queries.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"
import { SftCreateCoverageForm } from "./sft-authoring-forms.client"

export async function SftCoverageSection({
  organizationId,
  rangeStart,
  rangeEnd,
  canManage,
}: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  let rows: Awaited<ReturnType<typeof compareCoverageHeadcount>>
  let templates: Awaited<ReturnType<typeof listAllShiftTemplatesForOrg>> = []
  let skills: Awaited<ReturnType<typeof listSkillsForOrg>> = []
  let positions: Awaited<ReturnType<typeof listPositionsForOrg>> = []
  let courses: Awaited<ReturnType<typeof listTrainingCoursesForOrg>> = []

  try {
    const queries: [
      ReturnType<typeof compareCoverageHeadcount>,
      Promise<typeof templates> | Promise<[]>,
      Promise<typeof skills> | Promise<[]>,
      Promise<typeof positions> | Promise<[]>,
      Promise<typeof courses> | Promise<[]>,
    ] = [
      compareCoverageHeadcount({ organizationId, rangeStart, rangeEnd }),
      canManage
        ? listAllShiftTemplatesForOrg(organizationId)
        : Promise.resolve([]),
      canManage
        ? listSkillsForOrg(organizationId, { includeArchived: false })
        : Promise.resolve([]),
      canManage
        ? listPositionsForOrg(organizationId, { includeArchived: false })
        : Promise.resolve([]),
      canManage
        ? listTrainingCoursesForOrg(organizationId)
        : Promise.resolve([]),
    ]
    ;[rows, templates, skills, positions, courses] = await Promise.all(queries)
  } catch (err) {
    logUnexpectedServerError("sft-coverage-section: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("coverageTitle")}</CardTitle>
          <CardDescription>{t("coverageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildSftEmbeddedListSurfaceErrorConfiguration({
              columnsId: SFT_LIST_SURFACE_IDS.coverage,
              emptyTitle: t("coverageEmpty"),
              firstColumn: { id: "date", header: t("colDate") },
            })}
            surfaceKey="hrm:shift-scheduling:coverage:error"
            resolveConfiguredPermission={false}
            loadError={{ variant: "error", title: t("coverageLoadFailed") }}
          />
        </CardContent>
      </Card>
    )
  }

  const statusLabel = (status: (typeof rows)[number]["staffingStatus"]) => {
    if (status === "understaffed") return t("staffingUnder")
    if (status === "overstaffed") return t("staffingOver")
    return t("staffingMet")
  }

  const listConfiguration = buildSftCoverageListSurfaceConfiguration(rows, {
    empty: t("coverageEmpty"),
    colDate: t("colDate"),
    colShift: t("colShift"),
    colRequired: t("colRequired"),
    colAssigned: t("colAssigned"),
    colStatus: t("colStatus"),
    statusLabel,
  })

  const templateChoices = templates.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
  }))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("coverageTitle")}</CardTitle>
        <CardDescription>{t("coverageDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {canManage ? (
          <div className="rounded-md border border-border p-4">
            <h4 className="text-sm font-medium">{t("coverageCreateTitle")}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("coverageCreateDescription")}
            </p>
            <div className="mt-4">
              <SftCreateCoverageForm
                templates={templateChoices}
                skills={skills.map((skill) => ({
                  id: skill.id,
                  code: skill.code,
                  name: skill.label,
                }))}
                positions={positions.map((pos) => ({
                  id: pos.id,
                  code: pos.code,
                  name: pos.title,
                }))}
                trainingCourses={courses.map((course) => ({
                  id: course.id,
                  code: course.code,
                  name: course.name,
                }))}
                defaultDate={rangeStart}
              />
            </div>
          </div>
        ) : null}
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.coverage}
          invalid={{
            variant: "error",
            title: t("coverageLoadFailed"),
          }}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.coverage}`}
        />
      </CardContent>
    </Card>
  )
}
