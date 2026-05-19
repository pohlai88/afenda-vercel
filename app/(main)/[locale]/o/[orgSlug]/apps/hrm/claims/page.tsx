import { ClaimsPage, HrmErpAccessDenied } from "#features/hrm"
import { getOrgTenantContext } from "#lib/auth"
import {
  resolveClaimSurfaceAccess,
  type ClaimSurfaceAccess,
} from "#features/hrm/server"

export default async function OrgAppsHrmClaimsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/claims">) {
  const [{ orgSlug }, session] = await Promise.all([
    params,
    getOrgTenantContext(),
  ])
  const access: ClaimSurfaceAccess = await resolveClaimSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  if (!access.canEnter) {
    return (
      <HrmErpAccessDenied surface="claims" />
    )
  }
  return <ClaimsPage orgSlug={orgSlug} access={access} />
}
