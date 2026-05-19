import { redirect } from "next/navigation"

import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import { getOrgTenantContext } from "#lib/auth"

import { HrmOverviewPage } from "../_hrm_landing_page/hrm-pages"
import { HrmErpAccessDenied } from "../_module-governance/hrm-erp-access-denied.server"
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
      <HrmErpAccessDenied surface="workbenchOverview" />
    )
  }
  return <HrmOverviewPage orgSlug={orgSlug} />
}
