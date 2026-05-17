import { CandidatePortalStatusPage } from "#features/hrm"


type CandidateApplicationStatusRouteProps = {
  params: Promise<{ portalSlug: string; token: string }>
}

export default async function CandidateApplicationStatusRoute({
  params,
}: CandidateApplicationStatusRouteProps) {
  const { portalSlug, token } = await params
  return <CandidatePortalStatusPage portalSlug={portalSlug} token={token} />
}
