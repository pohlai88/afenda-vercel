import { notFound } from "next/navigation"

import { getHrmCapabilityById, HrmImportsPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { getErpPermissionDefinition } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmImportsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/imports">) {
  const { orgSlug } = await params
  const capability = getHrmCapabilityById("imports")
  if (!capability) notFound()
  const permission = getErpPermissionDefinition(capability.requiredPermission)
  if (!permission) notFound()

  const allowed = await canUseErpPermissionForCurrentOrg({
    module: permission.module,
    object: permission.object,
    function: permission.function,
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="HRM imports"
        description="This HRM surface requires HRM import search access."
      />
    )
  }
  return <HrmImportsPage orgSlug={orgSlug} />
}
