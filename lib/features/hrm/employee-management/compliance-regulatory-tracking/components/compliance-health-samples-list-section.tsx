import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { Link } from "#i18n/navigation"

import { organizationHrmComplianceDetailPath } from "../../../constants"
import { buildComplianceHealthSamplesListSurfaceConfiguration } from "../data/compliance-list-surface.server"
import {
  highestComplianceAgingTier,
  type ComplianceHealthAttentionBucket,
} from "../data/compliance-operational-health.shared"
import type { ComplianceHealthSampleRow } from "../data/compliance-operational-health.queries.server"
import { compliancePackTypeLabel } from "../data/compliance-pack-labels.shared"

type ComplianceHealthSamplesListSectionProps = {
  bucket: ComplianceHealthAttentionBucket
  samples: readonly ComplianceHealthSampleRow[]
  orgSlug: string
}

export async function ComplianceHealthSamplesListSection({
  bucket,
  samples,
  orgSlug,
}: ComplianceHealthSamplesListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.compliance.operationalHealth")

  const listConfiguration =
    buildComplianceHealthSamplesListSurfaceConfiguration(bucket, samples, {
      empty: t("samplesEmpty"),
      colPack: t("colPack"),
      colPeriod: t("colPeriod"),
      colAge: t("colAge"),
      colTier: t("colTier"),
      packLabelFor: compliancePackTypeLabel,
      formatPeriod: (row) =>
        row.periodStart && row.periodEnd
          ? `${row.periodStart} — ${row.periodEnd}`
          : "—",
      ageLabelFor: (ageDays) =>
        ageDays === 0 ? t("ageToday") : t("ageDays", { days: ageDays }),
      tierLabelFor: (sampleBucket, row) => {
        if (sampleBucket !== "needs_attention_stuck") return "—"
        const tier = highestComplianceAgingTier(row.ageDays)
        if (tier === "detected") return t("agingTier.detected")
        if (tier === "escalated") return t("agingTier.escalated")
        return t("agingTier.critical")
      },
    })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey={`hrm:compliance:health-samples:${bucket}`}
      trailingColumn={{
        header: t("inspect"),
        render: (surfaceRow) => {
          const trailingAction = surfaceRow.trailingAction
          const sample = samples.find((row) => row.id === surfaceRow.id)
          if (
            !sample ||
            !isListSurfaceTrailingActionRenderable(trailingAction)
          ) {
            return null
          }
          const label = compliancePackTypeLabel(sample.packType)
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <Link
                href={organizationHrmComplianceDetailPath(
                  orgSlug,
                  surfaceRow.id
                )}
                className="text-sm text-primary underline-offset-2 hover:underline"
                aria-label={t("inspectTimelineAria", { pack: label })}
              >
                {t("inspect")}
              </Link>
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
