import { ClaimsPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { requireOrgSession } from "#lib/tenant"
import {
  resolveClaimSurfaceAccess,
  type ClaimSurfaceAccess,
} from "#features/hrm/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmClaimsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/claims">) {
  const [{ orgSlug }, session] = await Promise.all([
    params,
    requireOrgSession(),
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
