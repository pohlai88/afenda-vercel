import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import {
  OrgAdminSimulationToolbar,
  OrgAuditEventsView,
  OrganizationAuditCsvExport,
  organizationAdminPath,
} from "#features/org-admin"
import { isOperationalSimulationEnabled } from "#features/simulation"

import {
  searchParamFirst,
  searchParamPositiveInt,
} from "#lib/app-search-params.shared"
import {
  listOrganizationIamAuditEvents,
  parseOrganizationIamAuditOriginFilterParam,
} from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgAdminAuditPage({
  searchParams,
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/audit">) {
  const { orgSlug } = await params
  const orgSession = await requireOrgSession()
  const t = await getTranslations("OrgAdmin.audit")
  const simulationEnabled = isOperationalSimulationEnabled()
  const sp = await searchParams
  const page = searchParamPositiveInt(sp, "page", 1)
  const auditOriginFilter = parseOrganizationIamAuditOriginFilterParam(
    searchParamFirst(sp, "view")
  )

  const result = await listOrganizationIamAuditEvents({
    organizationId: orgSession.organizationId,
    page,
    auditOriginFilter,
  })

  const auditBase = organizationAdminPath(orgSlug, "audit")

  function auditListingHref(targetPage: number): Route {
    const params = new URLSearchParams()
    if (targetPage > 1) params.set("page", String(targetPage))
    if (auditOriginFilter === "simulation") params.set("view", "simulated")
    else if (auditOriginFilter === "all") params.set("view", "all")
    const q = params.toString()
    return (q.length > 0 ? `${auditBase}?${q}` : auditBase) as Route
  }

  const prevHref = page > 1 ? auditListingHref(page - 1) : null
  const nextHref =
    result.totalPages > 0 && page < result.totalPages
      ? auditListingHref(page + 1)
      : null

  const viewLinks = [
    {
      label: t("viewProduction"),
      href: auditBase,
      isActive: auditOriginFilter === "production",
    },
    {
      label: t("viewSimulated"),
      href: `${auditBase}?view=simulated` as Route,
      isActive: auditOriginFilter === "simulation",
    },
    {
      label: t("viewAll"),
      href: `${auditBase}?view=all` as Route,
      isActive: auditOriginFilter === "all",
    },
  ] as const

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
      exportSlot={
        <>
          {simulationEnabled ? <OrgAdminSimulationToolbar /> : null}
          <OrganizationAuditCsvExport />
        </>
      }
      viewLinks={[...viewLinks]}
      backHref={organizationAdminPath(orgSlug, "overview")}
      backLabel={t("backToWorkbench")}
      result={result}
      prevHref={prevHref}
      nextHref={nextHref}
    />
  )
}
