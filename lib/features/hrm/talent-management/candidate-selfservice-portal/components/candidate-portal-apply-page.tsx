import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmJobRequisition } from "#lib/db/schema"
import { requirePublicCandidatePortal } from "#lib/portal/public-portal.server"

import { CandidatePortalApplyForm } from "./candidate-portal-apply-form.client"
import { CandidatePortalChrome } from "./candidate-portal-chrome"

type CandidatePortalApplyPageProps = {
  portalSlug: string
  requisitionId: string
}

export async function CandidatePortalApplyPage({
  portalSlug,
  requisitionId,
}: CandidatePortalApplyPageProps) {
  const portal = await requirePublicCandidatePortal(portalSlug)

  const [requisition] = await db
    .select({
      id: hrmJobRequisition.id,
      title: hrmJobRequisition.title,
      status: hrmJobRequisition.status,
    })
    .from(hrmJobRequisition)
    .where(
      and(
        eq(hrmJobRequisition.id, requisitionId),
        eq(hrmJobRequisition.organizationId, portal.organizationId)
      )
    )
    .limit(1)

  if (!requisition || requisition.status !== "open") {
    notFound()
  }

  return (
    <CandidatePortalChrome portal={portal}>
      <CandidatePortalApplyForm
        portalSlug={portalSlug}
        requisitionId={requisitionId}
        requisitionTitle={requisition.title}
      />
    </CandidatePortalChrome>
  )
}
