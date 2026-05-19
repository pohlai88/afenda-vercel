import { CandidatePortalApplyPage } from "#features/hrm"

type CandidateApplyRouteProps = {
  params: Promise<{ portalSlug: string; requisitionId: string }>
}

export default async function CandidateApplyRoute({
  params,
}: CandidateApplyRouteProps) {
  const { portalSlug, requisitionId } = await params
  return (
    <CandidatePortalApplyPage
      portalSlug={portalSlug}
      requisitionId={requisitionId}
    />
  )
}
