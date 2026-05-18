import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildBureauReliabilityListSurfaceConfiguration } from "../data/bureau-reliability-list-surface.server"
import {
  type BureauReliabilityHealth,
  type BureauReliabilitySnapshot,
} from "../data/bureau-reliability.shared"

type BureauReliabilityListSectionProps = {
  snapshot: BureauReliabilitySnapshot
}

export async function BureauReliabilityListSection({
  snapshot,
}: BureauReliabilityListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.bureauReliability"),
    getFormatter(),
  ])

  const healthLabels: Record<BureauReliabilityHealth, string> = {
    healthy: t("health.healthy"),
    degraded: t("health.degraded"),
    critical: t("health.critical"),
    no_data: t("health.no_data"),
  }

  const metricNone = t("metric.none")
  const metricDays = t("metric.daysSuffix")
  const metricMs = t("metric.msSuffix")

  const listConfiguration = buildBureauReliabilityListSurfaceConfiguration(
    snapshot,
    {
      empty: t("emptyNoData"),
      colAuthority: t("column.authority"),
      colHealth: t("column.health"),
      colSubmissions: t("column.submissions"),
      colDeliveryRate: t("column.deliveryRate"),
      colAckRate: t("column.ackRate"),
      colMedianLatency: t("column.medianLatency"),
      colOldestPending: t("column.oldestPending"),
      healthLabel: (health) => healthLabels[health],
      formatAuthority: (row) =>
        row.packTypes.length > 0
          ? `${row.authority} · ${row.packTypes.join(", ")}`
          : row.authority,
      formatSubmissions: (row) =>
        row.totalSubmissions === 0
          ? metricNone
          : format.number(row.totalSubmissions, { maximumFractionDigits: 0 }),
      formatDeliveryRate: (row) =>
        row.deliverySuccessRate === null
          ? metricNone
          : format.number(row.deliverySuccessRate, {
              style: "percent",
              maximumFractionDigits: 1,
            }),
      formatAckRate: (row) =>
        row.acknowledgementRate === null
          ? metricNone
          : format.number(row.acknowledgementRate, {
              style: "percent",
              maximumFractionDigits: 1,
            }),
      formatMedianLatency: (row) =>
        row.medianDeliveryDurationMs === null
          ? metricNone
          : `${format.number(row.medianDeliveryDurationMs, { maximumFractionDigits: 0 })} ${metricMs}`,
      formatOldestPending: (row) =>
        row.oldestPendingAckAgeDays === null
          ? metricNone
          : `${format.number(row.oldestPendingAckAgeDays, { maximumFractionDigits: 0 })} ${metricDays}`,
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:compliance:bureau-reliability"
    />
  )
}
