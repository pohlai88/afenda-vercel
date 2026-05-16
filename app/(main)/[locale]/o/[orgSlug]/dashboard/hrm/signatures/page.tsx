import { SignaturesPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmSignaturesPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/signatures">) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "signature",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Signatures"
        description="This HRM surface requires signature search access."
      />
    )
  }
  return <SignaturesPage orgSlug={orgSlug} />
}
