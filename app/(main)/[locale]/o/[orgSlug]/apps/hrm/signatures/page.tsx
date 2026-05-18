import { SignaturesPage } from "#features/tools"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"


export default async function OrgAppsHrmSignaturesPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/signatures">) {
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
