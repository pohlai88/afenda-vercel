import { redirect } from "next/navigation"

import {
  HRM_CAPABILITIES,
  HrmOverviewPage,
  organizationHrmPath,
  resolveLeaveSurfaceAccess,
} from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac"
import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm">) {
  const { orgSlug } = await params
  const session = await requireOrgSession()
  const permissions = await listEffectiveErpPermissionsForUser({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  const hasHrmCapability = HRM_CAPABILITIES.some((capability) =>
    permissions.includes(capability.requiredPermission)
  )
  if (!hasHrmCapability) {
    const leaveAccess = await resolveLeaveSurfaceAccess({
      organizationId: session.organizationId,
      userId: session.userId,
    })
    if (leaveAccess.canEnter) {
      redirect(organizationHrmPath(orgSlug, "leave"))
    }

    return (
      <ErpAccessDenied
        title="Human resources"
        description="This surface requires explicit HRM RBAC before any HRM page can be opened."
      />
    )
  }
  return <HrmOverviewPage orgSlug={orgSlug} />
}
