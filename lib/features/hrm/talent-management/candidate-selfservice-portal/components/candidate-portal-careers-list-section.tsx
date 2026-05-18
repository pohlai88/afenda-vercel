import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildCandidateCareersListSurfaceConfiguration } from "../data/candidate-portal-surface-builders.server"
import type { JobRequisitionRow } from "../../recruitment-onboarding/data/recruitment.queries.server"

type CandidatePortalCareersListSectionProps = {
  portalSlug: string
  rows: readonly JobRequisitionRow[]
  copy: {
    pageTitle: string
    pageDescription: string
    emptyTitle: string
    colTitle: string
    colDepartment: string
    colHeadcount: string
    colStatus: string
    statusOpen: string
  }
}

export async function CandidatePortalCareersListSection({
  portalSlug,
  rows,
  copy,
}: CandidatePortalCareersListSectionProps) {
  const listConfiguration = buildCandidateCareersListSurfaceConfiguration(
    rows,
    portalSlug,
    copy
  )

  return (
    <GovernedPatternCListSection
      title={copy.pageTitle}
      description={copy.pageDescription}
      listConfiguration={listConfiguration}
      surfaceKey="portal:candidate:careers"
    />
  )
}
