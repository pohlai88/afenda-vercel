import { SignaturesPage } from "#features/tools"
import { HrmErpAccessDenied } from "#features/hrm"
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
      <HrmErpAccessDenied surface="signatures" />
    )
  }
  return <SignaturesPage orgSlug={orgSlug} />
}
