import { SignatureRequestDetailPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmSignatureDetailPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/signatures/[publicSlug]">) {
  const { orgSlug, publicSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "signature",
    function: "read",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Signature request"
        description="This HRM surface requires signature read access."
      />
    )
  }
  return (
    <SignatureRequestDetailPage orgSlug={orgSlug} publicSlug={publicSlug} />
  )
}
