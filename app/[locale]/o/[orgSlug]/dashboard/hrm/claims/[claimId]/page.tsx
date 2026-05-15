import { ClaimDetailPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { requireOrgSession } from "#lib/tenant"
import { resolveClaimSurfaceAccess } from "#features/hrm/server"

export const dynamic = "force-dynamic"

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
  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title="Claim detail"
        description="This HRM surface requires Claims access or a linked employee record."
      />
    )
  }
  return <ClaimDetailPage orgSlug={orgSlug} claimId={claimId} access={access} />
}
