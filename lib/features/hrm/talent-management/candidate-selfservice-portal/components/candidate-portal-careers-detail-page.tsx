import { notFound } from "next/navigation"

import { GovernedComponentRenderer } from "#components2/metadata"
import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import {
  candidatePortalCareersApplyPath,
} from "#lib/portal"
import { requirePublicCandidatePortal } from "#lib/portal/public-portal.server"

import { buildCandidateCareersDetailStatConfiguration } from "../data/candidate-portal-surface-builders.server"
import { listOpenRequisitionsForPublicCareers } from "../data/candidate-portal-access.server"
import { CandidatePortalChrome } from "./candidate-portal-chrome"

type CandidatePortalCareersDetailPageProps = {
  portalSlug: string
  requisitionId: string
}

export async function CandidatePortalCareersDetailPage({
  portalSlug,
  requisitionId,
}: CandidatePortalCareersDetailPageProps) {
  const portal = await requirePublicCandidatePortal(portalSlug)
  const requisitions = await listOpenRequisitionsForPublicCareers(
    portal.organizationId
  )
  const requisition = requisitions.find((row) => row.id === requisitionId)
  if (!requisition) {
    notFound()
  }

  const statConfiguration = buildCandidateCareersDetailStatConfiguration(
    requisition,
    {
      title: requisition.title,
      department: requisition.departmentName ?? "All departments",
      headcount: "Headcount",
      skills: "None listed",
    }
  )

  return (
    <CandidatePortalChrome portal={portal}>
      <CareersDetailPanel
        portalSlug={portalSlug}
        requisitionId={requisitionId}
        statConfiguration={statConfiguration}
      />
    </CandidatePortalChrome>
  )
}

function CareersDetailPanel({
  portalSlug,
  requisitionId,
  statConfiguration,
}: {
  portalSlug: string
  requisitionId: string
  statConfiguration: ReturnType<
    typeof buildCandidateCareersDetailStatConfiguration
  >
}) {
  return (
    <div className="flex flex-col gap-6">
      <GovernedComponentRenderer
        component={{
          type: "governed:stat-card",
          serverType: "governed:stat-card",
          configuration: statConfiguration,
        }}
      />
      <Button asChild className="w-fit">
        <Link
          href={candidatePortalCareersApplyPath(portalSlug, requisitionId)}
          prefetch={false}
        >
          Apply for this role
        </Link>
      </Button>
    </div>
  )
}
