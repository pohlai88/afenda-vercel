import { DocumentsPage } from "#features/hrm"
import { getTranslations } from "next-intl/server"
import { HrmShellAccessDenied } from "#features/hrm/components/hrm-shell-access-denied.server"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsHrmDocumentsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/apps/hrm/documents">) {
  const { orgSlug } = await params
  const sp = await searchParams
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "document",
    function: "search",
  })
  if (!allowed) {
    const t = await getTranslations("Dashboard.Hrm.documents")

    return <HrmShellAccessDenied surface={t("pageTitle")} />
  }

  // Coerce only string-shaped search params; arrays / undefined fall back
  // to the page composer's defaults (no filter active). The composer
  // re-validates `documentType` / `classification` against the canonical
  // enums before they ever reach the SQL `where` clause — this slice is
  // pure URL plumbing.
  const documentTypeParam =
    typeof sp.documentType === "string" ? sp.documentType : undefined
  const classificationParam =
    typeof sp.classification === "string" ? sp.classification : undefined
  const employeeIdParam =
    typeof sp.employeeId === "string" ? sp.employeeId : undefined

  return (
    <DocumentsPage
      orgSlug={orgSlug}
      documentTypeParam={documentTypeParam}
      classificationParam={classificationParam}
      employeeIdParam={employeeIdParam}
    />
  )
}
