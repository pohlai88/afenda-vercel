import { CandidatePortalCareersDetailPage } from "#features/hrm"

type PageProps = {
  params: Promise<{ portalSlug: string; requisitionId: string }>
}

export default async function CandidateCareersDetailRoute({
  params,
}: PageProps) {
  const { portalSlug, requisitionId } = await params
  return (
    <CandidatePortalCareersDetailPage
      portalSlug={portalSlug}
      requisitionId={requisitionId}
    />
  )
}
