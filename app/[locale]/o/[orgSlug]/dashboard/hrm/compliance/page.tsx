import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import { requireOrgSession } from "#lib/tenant"

import {
  listOrgEventDeliveriesByIds,
  listSubscribedEventTypesForOrg,
} from "#features/org-admin/server"
import type { OrgEventDeliverySummary } from "#features/org-admin"

import { listComplianceEvidenceForPeriod } from "#features/hrm/server"
import type { ComplianceEvidenceRow } from "#features/hrm/server"
import { listPayrollPeriodsForOrg } from "#features/hrm/server"
import type { PayrollPeriodRow } from "#features/hrm/server"
import { CompliancePage, STATUTORY_PACK_TO_EVENT_TYPE } from "#features/hrm/client"

export const dynamic = "force-dynamic"

type PageSearchParams = {
  periodId?: string
}

export default async function OrgDashboardHrmCompliancePage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.compliance")
  const { periodId } = await searchParams

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
      <CompliancePage
        period={period}
        evidenceRows={evidenceRows}
        allPeriods={allPeriods}
        packTypesWithSubscribedEndpoint={packTypesWithSubscribedEndpoint}
        deliveryById={deliveryById}
      />
    </div>
  )
}
