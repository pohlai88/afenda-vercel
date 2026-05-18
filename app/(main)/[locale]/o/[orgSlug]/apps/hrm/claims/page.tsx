import { ClaimsPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
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
      <ErpAccessDenied
        title="Claims"
        description="This HRM surface requires Claims access or a linked employee record."
      />
    )
  }
  return <ClaimsPage orgSlug={orgSlug} access={access} />
}
