import { SignatureRequestDetailPage } from "#features/tools"
import { HrmShellAccessDeniedFromNav } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmSignatureDetailPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/signatures/[publicSlug]">) {
  const { orgSlug, publicSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "signature",
    function: "read",
  })
  if (!allowed) {
    return <HrmShellAccessDeniedFromNav navKey="signatures" />
  }
  return (
    <SignatureRequestDetailPage orgSlug={orgSlug} publicSlug={publicSlug} />
  )
}
