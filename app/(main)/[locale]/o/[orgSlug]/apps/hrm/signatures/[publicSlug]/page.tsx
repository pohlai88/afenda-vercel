import { SignatureRequestDetailPage } from "#features/tools"
import { HrmErpAccessDenied } from "#features/hrm"
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
    return (
      <HrmErpAccessDenied surface="publicSignature" />
    )
  }
  return (
    <SignatureRequestDetailPage orgSlug={orgSlug} publicSlug={publicSlug} />
  )
}
