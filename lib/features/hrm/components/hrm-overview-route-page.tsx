import { redirect } from "next/navigation"

import { ErpAccessDenied } from "#features/erp-rbac/client"
import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import { getOrgTenantContext } from "#lib/auth"

import { HrmOverviewPage } from "../_hrm_landing_page/hrm-pages"
import { HRM_CAPABILITIES, organizationHrmPath } from "../constants"
import { resolveLeaveSurfaceAccess } from "../time-attendance/leave-attendance-management/data/leave-access.server"

/** `/apps/hrm` landing — RBAC gate + overview or leave fallback. */
export async function HrmOverviewRoutePage({ orgSlug }: { orgSlug: string }) {
  const { organizationId, userId } = await getOrgTenantContext()
  const permissions = await listEffectiveErpPermissionsForUser({
    organizationId,
    userId,
  })
  const hasHrmCapability = HRM_CAPABILITIES.some((capability) =>
    permissions.includes(capability.requiredPermission)
  )
  if (!hasHrmCapability) {
    const leaveAccess = await resolveLeaveSurfaceAccess({
      organizationId,
      userId,
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
