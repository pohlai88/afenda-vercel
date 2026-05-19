import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildRecruitmentRequisitionsListSurfaceConfiguration } from "../data/recruitment-surface-builders.server"
import type { JobRequisitionRow } from "../data/recruitment.queries.server"

type RecruitmentRequisitionsListSectionProps = {
  orgSlug: string
  rows: readonly JobRequisitionRow[]
}

export async function RecruitmentRequisitionsListSection({
  orgSlug,
  rows,
}: RecruitmentRequisitionsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.recruitment")

  const listConfiguration =
    buildRecruitmentRequisitionsListSurfaceConfiguration(rows, orgSlug, {
      pageTitle: t("requisitionsTitle"),
      pageDescription: t("newRequisitionDescription"),
      empty: t("requisitionsEmpty"),
      colTitle: t("fieldTitle"),
      colDepartment: t("noDepartment"),
      colHeadcount: t("fieldHeadcount"),
      colStatus: "Status",
    })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:recruitment:requisitions"
    />
  )
}
