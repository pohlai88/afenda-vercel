import { notFound } from "next/navigation"
import { HrmShellAccessDeniedFromNav } from "#features/hrm/components/hrm-shell-access-denied.server"

import { getHrmCapabilityById } from "#features/hrm"
import { HrmImportsPage } from "#features/tools"
import { getErpPermissionDefinition } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmImportsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/imports">) {
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
    return <HrmShellAccessDeniedFromNav navKey="imports" />
  }
  return <HrmImportsPage orgSlug={orgSlug} />
}
