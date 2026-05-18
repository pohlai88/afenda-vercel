import { Suspense } from "react"

import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import {
  BureauReliabilityCard,
  BureauReliabilityCardSkeleton,
  ComplianceEmployeeStatusPanel,
  ComplianceExceptionsPanel,
  ComplianceEvidenceRegisterPanel,
  ComplianceFilingsPanel,
  ComplianceOperationalHealth,
  ComplianceOperationalHealthSkeleton,
} from "#features/hrm"
import { CompliancePage, STATUTORY_PACK_TO_EVENT_TYPE } from "#features/hrm/client"
import {
  listComplianceEvidenceForPeriod,
  listPayrollPeriodsForOrg,
  resolveComplianceSurfaceCapabilities,
  type ComplianceEvidenceRow,
  type PayrollPeriodRow,
} from "#features/hrm/server"
import {
  listOrgEventDeliveriesByIds,
  listSubscribedEventTypesForOrg,
} from "#features/org-admin/server"
import type { OrgEventDeliverySummary } from "#features/org-admin"
import type { OrgSession } from "#lib/auth"

export type HrmComplianceWorkbenchPageProps = {
  orgSlug: string
  orgSession: OrgSession
  periodId?: string
}

export async function HrmComplianceWorkbenchPage({
  orgSlug,
  orgSession,
  periodId,
}: HrmComplianceWorkbenchPageProps) {
  const t = await getTranslations("Dashboard.Hrm.compliance")
  const capabilities = await resolveComplianceSurfaceCapabilities()

  const [allPeriods, subscribedEventTypes] = await Promise.all([
    listPayrollPeriodsForOrg(orgSession.organizationId),
    listSubscribedEventTypesForOrg(orgSession.organizationId),
  ])

  const resolvedPeriodId = periodId ?? allPeriods[0]?.id

  let period: PayrollPeriodRow | null = null
  let evidenceRows: ComplianceEvidenceRow[] = []
  let deliveryById: Record<string, OrgEventDeliverySummary> = {}

  if (resolvedPeriodId) {
    period = allPeriods.find((p) => p.id === resolvedPeriodId) ?? null

    if (period) {
      evidenceRows = await listComplianceEvidenceForPeriod(
        orgSession.organizationId,
        period.id
      )

      const deliveryIds = evidenceRows
        .map((row) => row.submissionDeliveryId)
        .filter((id): id is string => Boolean(id))

      if (deliveryIds.length > 0) {
        const map = await listOrgEventDeliveriesByIds(
          orgSession.organizationId,
          deliveryIds
        )
        deliveryById = Object.fromEntries(map.entries())
      }
    }
  }

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
      <Suspense fallback={<ComplianceOperationalHealthSkeleton />}>
        <ComplianceOperationalHealth
          organizationId={orgSession.organizationId}
          orgSlug={orgSlug}
        />
      </Suspense>
      <Suspense fallback={<BureauReliabilityCardSkeleton />}>
        <BureauReliabilityCard organizationId={orgSession.organizationId} />
      </Suspense>
      <CompliancePage period={period} allPeriods={allPeriods} />
      <ComplianceEvidenceRegisterPanel
        period={period}
        evidenceRows={evidenceRows}
        orgSlug={orgSlug}
        packTypesWithSubscribedEndpoint={packTypesWithSubscribedEndpoint}
        deliveryById={deliveryById}
      />
      <ComplianceEmployeeStatusPanel organizationId={orgSession.organizationId} />
      <ComplianceFilingsPanel
        organizationId={orgSession.organizationId}
        orgSlug={orgSlug}
        capabilities={capabilities}
      />
      <ComplianceExceptionsPanel orgSlug={orgSlug} capabilities={capabilities} />
    </div>
  )
}
