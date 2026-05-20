import { SignatureRequestDetailPage } from "#features/tools"
import { getTranslations } from "next-intl/server"
import { ErpAccessDenied } from "#features/erp-rbac/client"
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
    const t = await getTranslations("Dashboard.Hrm.publicSignature")

    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }
  return (
    <SignatureRequestDetailPage orgSlug={orgSlug} publicSlug={publicSlug} />
  )
}
