import {
  CompensationPlanningPage,
  resolveCompensationPlanningSurfaceAccess,
} from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAppsHrmCompensationPlanningPage() {
  const session = await getOrgTenantContext()
  const access = await resolveCompensationPlanningSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })

  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title="Compensation planning"
        description="This HRM surface requires Compensation Planning search or read access."
      />
    )
  }

  return (
    <CompensationPlanningPage
      access={access}
      organizationId={session.organizationId}
    />
  )
}
