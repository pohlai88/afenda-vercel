import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import {
  OrgAdminSimulationToolbar,
  OrgAuditEventsListSection,
  OrgAuditEventsView,
  OrganizationAuditCsvExport,
  organizationAdminPath,
  serializeOrgAdminAuditSearchParams,
} from "#features/org-admin"
import {
  recordOrgAdminPageVisit,
  resolveOrgAdminAuditSearchParams,
} from "#features/org-admin/server"
import { isOperationalSimulationEnabled } from "#features/simulation"

import { listOrganizationIamAuditEvents } from "#lib/auth"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAdminAuditPage({
  searchParams,
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/audit">) {
  const { orgSlug } = await params
  const orgSession = await getOrgTenantContext()
  const t = await getTranslations("OrgAdmin.audit")
  const simulationEnabled = isOperationalSimulationEnabled()

  // Working Memory Rail — record this page in the operator's recents.
  // Note: only the bare path is recorded (no query string), so paginating
  // the audit log doesn't fan out into many recents rows.
  await recordOrgAdminPageVisit({
    orgSession,
    orgSlug,
    segment: "audit",
  })

  const { page, auditOriginFilter } =
    await resolveOrgAdminAuditSearchParams(searchParams)

  const result = await listOrganizationIamAuditEvents({
    organizationId: orgSession.organizationId,
    page,
    auditOriginFilter,
  })

  const auditBase = organizationAdminPath(orgSlug, "audit")

  function auditListingHref(targetPage: number): Route {
    const href = serializeOrgAdminAuditSearchParams(auditBase, {
      page: targetPage <= 1 ? null : targetPage,
      view:
        auditOriginFilter === "simulation"
          ? "simulated"
          : auditOriginFilter === "all"
            ? "all"
            : null,
    })
    return href as Route
  }

  const prevHref = page > 1 ? auditListingHref(page - 1) : null
  const nextHref =
    result.totalPages > 0 && page < result.totalPages
      ? auditListingHref(page + 1)
      : null

  const viewLinks = [
    {
      label: t("viewProduction"),
      href: serializeOrgAdminAuditSearchParams(auditBase, {
        page: null,
        view: null,
      }) as Route,
      isActive: auditOriginFilter === "production",
    },
    {
      label: t("viewSimulated"),
      href: serializeOrgAdminAuditSearchParams(auditBase, {
        page: null,
        view: "simulated",
      }) as Route,
      isActive: auditOriginFilter === "simulation",
    },
    {
      label: t("viewAll"),
      href: serializeOrgAdminAuditSearchParams(auditBase, {
        page: null,
        view: "all",
      }) as Route,
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
      backLabel={t("backToAdminOverview")}
      result={result}
      listSlot={<OrgAuditEventsListSection rows={result.rows} />}
      prevHref={prevHref}
      nextHref={nextHref}
    />
  )
}
