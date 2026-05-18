import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { requireOrgSession } from "#lib/auth"

import { listSkillsForOrg } from "../data/skill.queries.server"

import { HrmSkillsCatalogSection } from "./hrm-skills-catalog-section"
import { SkillMatrixPanel } from "./skill-matrix-panel"

type HrmSkillsPageProps = {
  readonly orgSlug: string
  readonly canMutate: boolean
}

export async function HrmSkillsPage({
  orgSlug,
  canMutate,
}: HrmSkillsPageProps) {
  const { organizationId } = await requireOrgSession()
  const [skills, t] = await Promise.all([
    listSkillsForOrg(organizationId, { includeArchived: false }),
    getTranslations("Dashboard.Hrm.skills"),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <HrmSkillsCatalogSection
        orgSlug={orgSlug}
        skills={skills}
        canMutate={canMutate}
      />

      <SkillMatrixPanel organizationId={organizationId} />
    </div>
  )
}
