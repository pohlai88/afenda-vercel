import { Suspense } from "react"

import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { requireOrgSession } from "#lib/auth"

import {
  listOrgEventDeliveriesByIds,
  listSubscribedEventTypesForOrg,
} from "#features/org-admin/server"
import type { OrgEventDeliverySummary } from "#features/org-admin"

import { listComplianceEvidenceForPeriod } from "#features/hrm/server"
import type { ComplianceEvidenceRow } from "#features/hrm/server"
import { listPayrollPeriodsForOrg } from "#features/hrm/server"
import type { PayrollPeriodRow } from "#features/hrm/server"
import { resolveComplianceSurfaceCapabilities } from "#features/hrm/server"
import {
  BureauReliabilityCard,
  BureauReliabilityCardSkeleton,
  ComplianceEmployeeStatusPanel,
  ComplianceExceptionsPanel,
  ComplianceFilingsPanel,
  ComplianceOperationalHealth,
  ComplianceOperationalHealthSkeleton,
} from "#features/hrm"
import {
  CompliancePage,
  STATUTORY_PACK_TO_EVENT_TYPE,
} from "#features/hrm/client"


type PageSearchParams = {
  periodId?: string
}

export default async function OrgDashboardHrmCompliancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
  searchParams: Promise<PageSearchParams>
}) {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "compliance",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Compliance"
        description="This HRM surface requires Compliance search access."
      />
    )
  }
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.compliance")
  const { orgSlug } = await params
  const { periodId } = await searchParams
  const capabilities = await resolveComplianceSurfaceCapabilities()

  // Tier A authority resolved by `requireOrgSession`. Parallelize the two
  // independent reads that always run for this surface (Next.js best practice
  // — avoid request waterfalls in Server Components).
  const [allPeriods, subscribedEventTypes] = await Promise.all([
    listPayrollPeriodsForOrg(session.organizationId),
    listSubscribedEventTypesForOrg(session.organizationId),
  ])

  const resolvedPeriodId = periodId ?? allPeriods[0]?.id

  let period: PayrollPeriodRow | null = null
  let evidenceRows: ComplianceEvidenceRow[] = []
  let deliveryById: Record<string, OrgEventDeliverySummary> = {}

  if (resolvedPeriodId) {
    period = allPeriods.find((p) => p.id === resolvedPeriodId) ?? null

    if (period) {
      evidenceRows = await listComplianceEvidenceForPeriod(
        session.organizationId,
        period.id
      )

      // Phase 3F: attach delivery diagnostics for every evidence row that has
      // ever been sent (single batched query, IDOR-safe via endpoint join).
      const deliveryIds = evidenceRows
        .map((row) => row.submissionDeliveryId)
        .filter((id): id is string => Boolean(id))

      if (deliveryIds.length > 0) {
        const map = await listOrgEventDeliveriesByIds(
          session.organizationId,
          deliveryIds
        )
        deliveryById = Object.fromEntries(map.entries())
      }
    }
  }

  // Pack types with at least one enabled subscribed endpoint — gates the
  // "Send to bureau" affordance per-row without an extra fetch.
  const packTypesWithSubscribedEndpoint: string[] = []
  for (const [packType, eventType] of Object.entries(
    STATUTORY_PACK_TO_EVENT_TYPE
  )) {
    if (subscribedEventTypes.has(eventType)) {
      packTypesWithSubscribedEndpoint.push(packType)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
      {/*
       * Phase 3L: cross-period operational health is Tier B enrichment —
       * stream it independently so it never blocks the period selector
       * or per-period evidence list. Geometry-matched skeleton avoids
       * layout shift on first paint (App Router runtime doctrine).
       */}
      <Suspense fallback={<ComplianceOperationalHealthSkeleton />}>
        <ComplianceOperationalHealth
          organizationId={session.organizationId}
          orgSlug={orgSlug}
        />
      </Suspense>
      {/*
       * Phase 3N: per-bureau reliability is independent of period selection
       * AND of operational health — stream it as a sibling Tier B fragment
       * so a slow KWSP/LHDN deliveries scan never blocks the rest of the
       * page (Next.js parallel Suspense streaming).
       */}
      <Suspense fallback={<BureauReliabilityCardSkeleton />}>
        <BureauReliabilityCard organizationId={session.organizationId} />
      </Suspense>
      <CompliancePage
        period={period}
        evidenceRows={evidenceRows}
        allPeriods={allPeriods}
        packTypesWithSubscribedEndpoint={packTypesWithSubscribedEndpoint}
        deliveryById={deliveryById}
        orgSlug={orgSlug}
      />
      <ComplianceEmployeeStatusPanel organizationId={session.organizationId} />
      <ComplianceFilingsPanel
        organizationId={session.organizationId}
        orgSlug={orgSlug}
        capabilities={capabilities}
      />
      <ComplianceExceptionsPanel
        orgSlug={orgSlug}
        capabilities={capabilities}
      />
    </div>
  )
}
