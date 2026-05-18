import { requirePublicCandidatePortal } from "#lib/portal/public-portal.server"

import { listOpenRequisitionsForPublicCareers } from "../data/candidate-portal-access.server"
import { CandidatePortalCareersListSection } from "./candidate-portal-careers-list-section"
import { CandidatePortalChrome } from "./candidate-portal-chrome"

type CandidatePortalCareersPageProps = {
  portalSlug: string
}

const CAREERS_COPY = {
  pageTitle: "Open roles",
  pageDescription:
    "Browse published openings and apply with a structured profile. No account required to view listings.",
  emptyTitle: "No open roles right now",
  colTitle: "Role",
  colDepartment: "Department",
  colHeadcount: "Headcount",
  colStatus: "Status",
  statusOpen: "Open",
} as const

export async function CandidatePortalCareersPage({
  portalSlug,
}: CandidatePortalCareersPageProps) {
  const portal = await requirePublicCandidatePortal(portalSlug)
  const requisitions = await listOpenRequisitionsForPublicCareers(
    portal.organizationId
  )

  return (
    <CandidatePortalChrome portal={portal}>
      <CandidatePortalCareersListSection
        portalSlug={portalSlug}
        rows={requisitions}
        copy={CAREERS_COPY}
      />
    </CandidatePortalChrome>
  )
}
