import { ClaimDetailPage } from "#features/hrm"
import { resolveClaimSurfaceAccess } from "#features/hrm/server"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAppsHrmClaimDetailPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/claims/[claimId]">) {
  const [{ orgSlug, claimId }, session] = await Promise.all([
    params,
    getOrgTenantContext(),
  ])
  const access = await resolveClaimSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  return <ClaimDetailPage orgSlug={orgSlug} claimId={claimId} access={access} />
}
