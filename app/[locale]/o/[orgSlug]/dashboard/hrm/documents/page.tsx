import { DocumentsPage } from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmDocumentsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/hrm/documents">) {
  const { orgSlug } = await params
  const sp = await searchParams

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
