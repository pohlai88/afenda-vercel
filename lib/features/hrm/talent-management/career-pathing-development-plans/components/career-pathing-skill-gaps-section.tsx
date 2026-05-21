import { Suspense } from "react"
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

import { buildCareerPathingEmbeddedListSurfaceErrorConfiguration } from "../data/career-pathing-embedded-list-surface-error.server"
import { buildSkillGapsListSurfaceConfiguration } from "../data/career-pathing-list-surface.server"
import {
  listSkillGapsForEmployee,
  listTargetRolesForOrg,
} from "../data/career-pathing.queries.server"
import { resolveCareerPathingSkillGapEmployeeId } from "../data/career-pathing-selection.shared"
import { CAREER_PATHING_LIST_SURFACE_IDS } from "../data/career-pathing-surface-metadata.shared"
import type { CareerPathingSectionProps } from "./career-pathing-section-props.shared"
import { CareerPathingEmployeeGapPicker } from "./career-pathing-query-pickers.client"

export async function CareerPathingSkillGapsSection({
  organizationId,
  selectedEmployeeId,
}: Pick<CareerPathingSectionProps, "organizationId" | "selectedEmployeeId">) {
  const t = await getTranslations("Dashboard.Hrm.careerPathing")

  let targetRoles: Awaited<ReturnType<typeof listTargetRolesForOrg>>
  try {
    targetRoles = await listTargetRolesForOrg(organizationId)
  } catch (err) {
    logUnexpectedServerError("career-pathing-skill-gaps: target roles failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("skillGapsTitle")}</CardTitle>
          <CardDescription>{t("skillGapsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
              columnsId: CAREER_PATHING_LIST_SURFACE_IDS.skillGaps,
              emptyTitle: t("skillGapsEmpty"),
              firstColumn: { id: "skill", header: t("colSkill") },
            })}
            surfaceKey="hrm:career-pathing:skill-gaps:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("skillGapsLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const gapEmployeeId = resolveCareerPathingSkillGapEmployeeId(
    targetRoles,
    selectedEmployeeId
  )

  if (!gapEmployeeId) {
    return null
  }

  const employeePickerOptions = [
    ...new Map(
      targetRoles.map((row) => [
        row.employeeId,
        { id: row.employeeId, label: row.employeeName },
      ])
    ).values(),
  ]

  let skillGaps: Awaited<ReturnType<typeof listSkillGapsForEmployee>>
  try {
    skillGaps = await listSkillGapsForEmployee(organizationId, gapEmployeeId)
  } catch (err) {
    logUnexpectedServerError("career-pathing-skill-gaps: gaps query failed", err, {
      organizationId,
      employeeId: gapEmployeeId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("skillGapsTitle")}</CardTitle>
          <CardDescription>{t("skillGapsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
              columnsId: CAREER_PATHING_LIST_SURFACE_IDS.skillGaps,
              emptyTitle: t("skillGapsEmpty"),
              firstColumn: { id: "skill", header: t("colSkill") },
            })}
            surfaceKey="hrm:career-pathing:skill-gaps:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("skillGapsLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("skillGapsTitle")}</CardTitle>
        <CardDescription>{t("skillGapsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {employeePickerOptions.length > 1 ? (
          <Suspense fallback={null}>
            <CareerPathingEmployeeGapPicker
              employees={employeePickerOptions}
              selectedEmployeeId={gapEmployeeId}
              label={t("selectEmployeeForGaps")}
            />
          </Suspense>
        ) : null}
        <GovernedPatternCListSection
          title={t("skillGapsTitle")}
          description={t("skillGapsDescription")}
          listConfiguration={buildSkillGapsListSurfaceConfiguration(skillGaps, {
            title: t("skillGapsTitle"),
            description: t("skillGapsDescription"),
            empty: t("skillGapsEmpty"),
            colSkill: t("colSkill"),
            colCurrent: t("colCurrent"),
            colTarget: t("colTarget"),
            colGap: t("colGap"),
          })}
          surfaceKey="hrm:career-pathing:skill-gaps"
          layout="embedded"
          resolveConfiguredPermission={false}
        />
      </CardContent>
    </Card>
  )
}
