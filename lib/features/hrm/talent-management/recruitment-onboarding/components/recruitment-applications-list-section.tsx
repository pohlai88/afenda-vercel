import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildRecruitmentApplicationsListSurfaceConfiguration } from "../data/recruitment-surface-builders.server"
import type { ApplicationPipelineRow } from "../data/recruitment.queries.server"

type RecruitmentApplicationsListSectionProps = {
  orgSlug: string
  rows: readonly ApplicationPipelineRow[]
}

export async function RecruitmentApplicationsListSection({
  orgSlug,
  rows,
}: RecruitmentApplicationsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.recruitment")

  const listConfiguration =
    buildRecruitmentApplicationsListSurfaceConfiguration(rows, orgSlug, {
      pageTitle: t("pipelineTitle"),
      pageDescription: t("newApplicationDescription"),
      empty: t("pipelineEmpty"),
      colCandidate: t("fieldCandidateName"),
      colRole: t("fieldRequisition"),
      colStage: "Stage",
    })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:recruitment:applications"
    />
  )
}
