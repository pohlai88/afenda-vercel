import { CandidatePortalCareersPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type CandidateCareersRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function CandidateCareersRoute({
  params,
}: CandidateCareersRouteProps) {
  const { portalSlug } = await params
  return <CandidatePortalCareersPage portalSlug={portalSlug} />
}
