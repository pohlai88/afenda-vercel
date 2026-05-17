import { ClaimDetailPage } from "#features/hrm"
import { requireOrgSession } from "#lib/auth"
import { resolveClaimSurfaceAccess } from "#features/hrm/server"


type OrgDashboardHrmClaimDetailPageProps = {
  params: Promise<{
    locale: string
    orgSlug: string
    claimId: string
  }>
}

export default async function OrgDashboardHrmClaimDetailPage({
  params,
}: OrgDashboardHrmClaimDetailPageProps) {
  const [{ orgSlug, claimId }, session] = await Promise.all([
    params,
    requireOrgSession(),
  ])
  const access = await resolveClaimSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  return <ClaimDetailPage orgSlug={orgSlug} claimId={claimId} access={access} />
}
