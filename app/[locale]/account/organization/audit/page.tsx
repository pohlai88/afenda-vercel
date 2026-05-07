import type { Route } from "next"

import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { OrgAuditEventsView, organizationAdminPath } from "#features/org-admin"

import { canActInOrganization, listOrganizationIamAuditEvents } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/org-slug.server"
import { requireOrgSession } from "#lib/tenant"

import { OrganizationAuditCsvExport } from "./audit-export-client"

type Search = Promise<{ page?: string | string[] }>

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export default async function OrganizationAuditPage({
  searchParams,
  params,
}: {
  searchParams: Search
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const auditPath = toLocalePath(locale, "/account/organization/audit")

  const orgSession = await requireOrgSession()
  const { organizationId } = orgSession
  const t = await getTranslations("OrgAdmin.audit")

  const allowed = await canActInOrganization(
    orgSession.userId,
    orgSession.user.role,
    organizationId,
    "admin"
  )
  if (!allowed) {
    redirect(toLocalePath(locale, "/account/organization") as Route)
  }

  const slug = await getOrganizationSlugById(organizationId)
  if (slug) {
    redirect(
      toLocalePath(locale, organizationAdminPath(slug, "audit")) as Route
    )
  }

  const sp = await searchParams
  const page = parsePage(
    typeof sp.page === "string"
      ? sp.page
      : Array.isArray(sp.page)
        ? sp.page[0]
        : undefined
  )

  const result = await listOrganizationIamAuditEvents({
    organizationId,
    page,
  })

  const prevHref = page > 1 ? (`${auditPath}?page=${page - 1}` as Route) : null
  const nextHref =
    result.totalPages > 0 && page < result.totalPages
      ? (`${auditPath}?page=${page + 1}` as Route)
      : null

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-6">
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
        backHref={"/account/organization" as Route}
        backLabel={t("backToOrganization")}
        result={result}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  )
}
