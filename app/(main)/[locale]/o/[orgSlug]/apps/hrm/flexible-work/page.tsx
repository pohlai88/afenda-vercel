import { FlexibleWorkPage, resolveFwaSurfaceAccess } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAppsHrmFlexibleWorkPage() {
  const session = await getOrgTenantContext()
  const access = await resolveFwaSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })
  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title="Flexible work"
        description="This HRM surface requires Flexible Work access or a linked employee record."
      />
    )
  }
  return (
    <FlexibleWorkPage
      access={access}
      organizationId={session.organizationId}
      userId={session.userId}
    />
  )
}
