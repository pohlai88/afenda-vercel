import { getFormatter, getTranslations } from "next-intl/server"

import type { OrgEventDeliverySummary } from "#features/org-admin"
import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { buildComplianceEvidenceRegisterListSurfaceConfiguration } from "../data/compliance-list-surface.server"
import { compliancePackTypeLabel } from "../data/compliance-pack-labels.shared"
import type { ComplianceEvidenceRow } from "../data/compliance.queries.server"
import type { PayrollPeriodRow } from "../../../payroll-compensation/payroll-processing/data/payroll.queries.server"
import {
  ComplianceEvidenceRegisterTrailing,
  type ComplianceEvidenceRegisterTrailingRow,
} from "./compliance-evidence-register-trailing.client"

type ComplianceEvidenceRegisterPanelProps = {
  period: PayrollPeriodRow | null
  evidenceRows: readonly ComplianceEvidenceRow[]
  orgSlug: string
  packTypesWithSubscribedEndpoint: readonly string[]
  deliveryById: Readonly<Record<string, OrgEventDeliverySummary>>
}

function mapDelivery(
  delivery: OrgEventDeliverySummary | null
): ComplianceEvidenceRegisterTrailingRow["delivery"] {
  if (!delivery) return null
  const completedAt = delivery.completedAt ?? delivery.createdAt
  return {
    state: delivery.state,
    httpStatus: delivery.httpStatus,
    durationMs: delivery.durationMs,
    attempts: delivery.attempts,
    errorMessage: delivery.errorMessage,
    completedAtIso: completedAt.toISOString(),
  }
}

function mapTrailingRow(
  row: ComplianceEvidenceRow,
  subscribedPackTypeSet: ReadonlySet<string>,
  deliveryById: Readonly<Record<string, OrgEventDeliverySummary>>
): ComplianceEvidenceRegisterTrailingRow {
  return {
    id: row.id,
    packType: row.packType,
    submissionState: row.submissionState,
    rulePackVersion: row.rulePackVersion,
    generatedAtIso: row.generatedAt.toISOString(),
    externalReference: row.externalReference,
    acknowledgedAtIso: row.acknowledgedAt?.toISOString() ?? null,
    acknowledgementSource: row.acknowledgementSource,
    authorityPayloadHash: row.authorityPayloadHash,
    endpointAvailable: subscribedPackTypeSet.has(row.packType),
    delivery: row.submissionDeliveryId
      ? mapDelivery(deliveryById[row.submissionDeliveryId] ?? null)
      : null,
  }
}

type ComplianceEvidenceRegisterListSectionProps = {
  evidenceRows: readonly ComplianceEvidenceRow[]
  orgSlug: string
  packTypesWithSubscribedEndpoint: readonly string[]
  deliveryById: Readonly<Record<string, OrgEventDeliverySummary>>
}

export async function ComplianceEvidenceRegisterListSection({
  evidenceRows,
  orgSlug,
  packTypesWithSubscribedEndpoint,
  deliveryById,
}: ComplianceEvidenceRegisterListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance"),
    getFormatter(),
  ])
  const subscribedPackTypeSet = new Set(packTypesWithSubscribedEndpoint)
  const listConfiguration = buildComplianceEvidenceRegisterListSurfaceConfiguration(
    evidenceRows,
    {
      empty: t("emptyFinalizePeriod"),
      colPack: t("colPack"),
      colState: t("colState"),
      colVersion: t("colVersion"),
      colGenerated: t("colGenerated"),
      packLabelFor: compliancePackTypeLabel,
      formatGenerated: (value) =>
        format.dateTime(value, { dateStyle: "medium" }),
    }
  )
  const trailingById = new Map(
    evidenceRows.map((row) => [
      row.id,
      mapTrailingRow(row, subscribedPackTypeSet, deliveryById),
    ])
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:compliance:evidence-register"
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const trailingAction = surfaceRow.trailingAction
          const row = trailingById.get(surfaceRow.id)
          if (!row || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <ComplianceEvidenceRegisterTrailing row={row} orgSlug={orgSlug} />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}

export async function ComplianceEvidenceRegisterPanel({
  period,
  evidenceRows,
  orgSlug,
  packTypesWithSubscribedEndpoint,
  deliveryById,
}: ComplianceEvidenceRegisterPanelProps) {
  const t = await getTranslations("Dashboard.Hrm.compliance")

  if (!period) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("emptyNoPeriod")}
        </CardContent>
      </Card>
    )
  }

  if (evidenceRows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("emptyFinalizePeriod")}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("evidenceRegister")} — {period.periodStart} to {period.periodEnd}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ComplianceEvidenceRegisterListSection
          evidenceRows={evidenceRows}
          orgSlug={orgSlug}
          packTypesWithSubscribedEndpoint={packTypesWithSubscribedEndpoint}
          deliveryById={deliveryById}
        />
      </CardContent>
    </Card>
  )
}
