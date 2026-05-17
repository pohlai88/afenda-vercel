import { GovernedComponentRenderer } from "#components2/metadata"
import { requirePublicCandidatePortal } from "#lib/portal/public-portal.server"

import { buildCandidateCareersListSurfaceConfiguration } from "../data/candidate-portal-surface-builders.server"
import { listOpenRequisitionsForPublicCareers } from "../data/candidate-portal-access.server"
import { CandidatePortalChrome } from "./candidate-portal-chrome"

type CandidatePortalCareersPageProps = {
  portalSlug: string
}

export async function CandidatePortalCareersPage({
  portalSlug,
}: CandidatePortalCareersPageProps) {
  const portal = await requirePublicCandidatePortal(portalSlug)
  const requisitions = await listOpenRequisitionsForPublicCareers(
    portal.organizationId
  )

  const listConfiguration = buildCandidateCareersListSurfaceConfiguration(
    requisitions,
    portalSlug,
    {
      pageTitle: "Open roles",
      pageDescription:
        "Browse published openings and apply with a structured profile. No account required to view listings.",
      emptyTitle: "No open roles right now",
      colTitle: "Role",
      colDepartment: "Department",
      colHeadcount: "Headcount",
      colStatus: "Status",
      statusOpen: "Open",
    }
  )

  return (
    <CandidatePortalChrome portal={portal}>
      <GovernedComponentRenderer
        component={{
          type: "governed:list-surface",
          serverType: "governed:list-surface",
          configuration: listConfiguration,
        }}
      />
    </CandidatePortalChrome>
  )
}
