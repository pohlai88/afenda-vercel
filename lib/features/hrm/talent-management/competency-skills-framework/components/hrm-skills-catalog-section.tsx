import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"

import { buildSkillListSurfaceConfiguration } from "../data/skill-list-surface.server"
import type { SkillListRow } from "../data/skill.queries.server"

import { SkillCreateDialog } from "./skill-create-dialog"
import { SkillEditDialog } from "./skill-edit-dialog"

type HrmSkillsCatalogSectionProps = {
  orgSlug: string
  skills: readonly SkillListRow[]
  canMutate: boolean
}

export async function HrmSkillsCatalogSection({
  orgSlug,
  skills,
  canMutate,
}: HrmSkillsCatalogSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.skills")

  const listConfiguration = buildSkillListSurfaceConfiguration(
    skills,
    {
      empty: t("empty"),
      colCode: t("headers.code"),
      colLabel: t("headers.label"),
      colCategory: t("headers.category"),
      noCategory: "—",
    },
    {
      canMutate,
      readOnlyReason: t("readOnlyMutateReason"),
    }
  )

  const skillById = new Map(skills.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("tableTitle")}
      description={
        canMutate ? t("tableDescriptionAdmin") : t("tableDescriptionRead")
      }
      listConfiguration={listConfiguration}
      surfaceKey="hrm:skills:catalog"
      cardClassName="mt-0 border-solid border-border"
      headerSlot={
        canMutate ? (
          <div className="mb-3 flex justify-end">
            <SkillCreateDialog orgSlug={orgSlug} />
          </div>
        ) : null
      }
      trailingColumn={
        canMutate
          ? {
              header: t("headers.actions"),
              render: (surfaceRow) => {
                if (
                  !isListSurfaceTrailingActionRenderable(
                    surfaceRow.trailingAction
                  )
                ) {
                  return null
                }
                const skill = skillById.get(surfaceRow.id)
                if (!skill) return null
                return (
                  <SkillEditDialog
                    orgSlug={orgSlug}
                    skillId={skill.id}
                    code={skill.code}
                    label={skill.label}
                    description={skill.description}
                  />
                )
              },
            }
          : undefined
      }
    />
  )
}
