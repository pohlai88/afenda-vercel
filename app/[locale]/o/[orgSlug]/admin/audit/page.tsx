import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import {
  OrgAuditEventsView,
  OrganizationAuditCsvExport,
  organizationAdminPath,
} from "#features/org-admin"

import { listOrganizationIamAuditEvents } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export default async function OrgAdminAuditPage({
  searchParams,
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/audit">) {
  const { orgSlug } = await params
  const orgSession = await requireOrgSession()
  const t = await getTranslations("OrgAdmin.audit")
  const sp = await searchParams
  const page = parsePage(
    typeof sp.page === "string"
      ? sp.page
      : Array.isArray(sp.page)
        ? sp.page[0]
        : undefined
  )

  const result = await listOrganizationIamAuditEvents({
    organizationId: orgSession.organizationId,
    page,
  })

  const auditBase = organizationAdminPath(orgSlug, "audit")
  const prevHref = page > 1 ? (`${auditBase}?page=${page - 1}` as Route) : null
  const nextHref =
    result.totalPages > 0 && page < result.totalPages
      ? (`${auditBase}?page=${page + 1}` as Route)
      : null

  return (
    <OrgAuditEventsView
      title={t("title")}
      description={
        <>
          {t("descriptionLead")}{" "}
          <code className="text-xs">{t("actionPrefix")}</code>
          {t("descriptionTail")}
        </>
      }
      exportSlot={<OrganizationAuditCsvExport />}
      backHref={organizationAdminPath(orgSlug, "overview")}
      backLabel={t("backToWorkbench")}
      result={result}
      prevHref={prevHref}
      nextHref={nextHref}
    />
  )
}
