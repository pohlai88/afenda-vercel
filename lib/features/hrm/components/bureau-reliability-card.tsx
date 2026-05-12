import { getFormatter, getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import {
  BUREAU_RELIABILITY_AUTHORITIES,
  type BureauReliabilityHealth,
  type BureauReliabilityRow,
} from "../data/bureau-reliability.shared"
import { getBureauReliabilitySnapshot } from "../data/bureau-reliability.queries.server"

/**
 * Phase 3N — per-bureau operational reliability card.
 *
 * Tier B Suspense-streamed Server Component. Answers "which bureau
 * interface is reliable today?" — distinct from Phase 3L (per-row
 * pressure across periods) and Phase 3K (per-row chronological truth).
 *
 * Doctrine:
 *   - Calm by default. Only `degraded` / `critical` carry color emphasis;
 *     `healthy` and `no_data` stay outline so a screen of green badges
 *     doesn't drown the operator in noise.
 *   - Rates render as `—` when null (the composer uses null instead of
 *     0 to distinguish "no signal" from "100% failure").
 *   - Render order is the canonical authority order from
 *     `BUREAU_RELIABILITY_AUTHORITIES`, NOT alphabetical, so the
 *     visual position of each bureau row stays stable across renders.
 */

type BureauReliabilityCardProps = {
  organizationId: string
  windowDays?: number
}

function badgeVariantForHealth(
  health: BureauReliabilityHealth
): "default" | "secondary" | "destructive" | "outline" {
  switch (health) {
    case "critical":
      return "destructive"
    case "degraded":
      return "secondary"
    case "healthy":
      return "default"
    case "no_data":
      return "outline"
  }
}

export async function BureauReliabilityCard({
  organizationId,
  windowDays,
}: BureauReliabilityCardProps) {
  const [t, format, snapshot] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.bureauReliability"),
    getFormatter(),
    getBureauReliabilitySnapshot(
      organizationId,
      windowDays !== undefined ? { windowDays } : {}
    ),
  ])

  const healthLabels: Record<BureauReliabilityHealth, string> = {
    healthy: t("health.healthy"),
    degraded: t("health.degraded"),
    critical: t("health.critical"),
    no_data: t("health.no_data"),
  }

  // Pre-resolve every i18n key once; pass to the row renderer as a plain
  // bag so it stays sync and free of `getTranslations` calls.
  const labels = {
    columnAuthority: t("column.authority"),
    columnHealth: t("column.health"),
    columnSubmissions: t("column.submissions"),
    columnDeliveryRate: t("column.deliveryRate"),
    columnAckRate: t("column.ackRate"),
    columnMedianLatency: t("column.medianLatency"),
    columnOldestPending: t("column.oldestPending"),
    metricNone: t("metric.none"),
    metricDays: t("metric.daysSuffix"),
    metricMs: t("metric.msSuffix"),
  }

  const totalSubmissions = snapshot.perAuthority.reduce(
    (sum, row) => sum + row.totalSubmissions,
    0
  )
  const noData = totalSubmissions === 0

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { windowDays: snapshot.windowDays })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {noData ? (
          <p className="text-sm text-muted-foreground">{t("emptyNoData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr className="text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-2 py-1 text-left font-medium">
                    {labels.columnAuthority}
                  </th>
                  <th className="px-2 py-1 text-left font-medium">
                    {labels.columnHealth}
                  </th>
                  <th className="px-2 py-1 text-right font-medium">
                    {labels.columnSubmissions}
                  </th>
                  <th className="px-2 py-1 text-right font-medium">
                    {labels.columnDeliveryRate}
                  </th>
                  <th className="px-2 py-1 text-right font-medium">
                    {labels.columnAckRate}
                  </th>
                  <th className="px-2 py-1 text-right font-medium">
                    {labels.columnMedianLatency}
                  </th>
                  <th className="px-2 py-1 text-right font-medium">
                    {labels.columnOldestPending}
                  </th>
                </tr>
              </thead>
              <tbody>
                {BUREAU_RELIABILITY_AUTHORITIES.map((authority) => {
                  const row = snapshot.perAuthority.find(
                    (r) => r.authority === authority
                  )
                  if (!row) return null
                  return (
                    <BureauRow
                      key={row.authority}
                      row={row}
                      healthLabels={healthLabels}
                      labels={labels}
                      formatPercent={(value) =>
                        format.number(value, {
                          style: "percent",
                          maximumFractionDigits: 1,
                        })
                      }
                      formatNumber={(value) =>
                        format.number(value, { maximumFractionDigits: 0 })
                      }
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t("footer", {
            windowDays: snapshot.windowDays,
            rowsConsidered: snapshot.rowsConsidered,
            computedAt: format.dateTime(snapshot.computedAt, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>
      </CardContent>
    </Card>
  )
}

type RowLabels = {
  metricNone: string
  metricDays: string
  metricMs: string
}

function BureauRow({
  row,
  healthLabels,
  labels,
  formatPercent,
  formatNumber,
}: {
  row: BureauReliabilityRow
  healthLabels: Record<BureauReliabilityHealth, string>
  labels: RowLabels
  formatPercent: (value: number) => string
  formatNumber: (value: number) => string
}) {
  return (
    <tr className="rounded-md bg-card/50">
      <th scope="row" className="px-2 py-2 text-left align-middle font-medium">
        {row.authority}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {row.packTypes.length > 0 ? row.packTypes.join(", ") : null}
        </span>
      </th>
      <td className="px-2 py-2 align-middle">
        <Badge variant={badgeVariantForHealth(row.health)}>
          {healthLabels[row.health]}
        </Badge>
      </td>
      <td className="px-2 py-2 text-right align-middle tabular-nums">
        {row.totalSubmissions === 0
          ? labels.metricNone
          : formatNumber(row.totalSubmissions)}
      </td>
      <td className="px-2 py-2 text-right align-middle tabular-nums">
        {row.deliverySuccessRate === null
          ? labels.metricNone
          : formatPercent(row.deliverySuccessRate)}
      </td>
      <td className="px-2 py-2 text-right align-middle tabular-nums">
        {row.acknowledgementRate === null
          ? labels.metricNone
          : formatPercent(row.acknowledgementRate)}
      </td>
      <td className="px-2 py-2 text-right align-middle tabular-nums">
        {row.medianDeliveryDurationMs === null
          ? labels.metricNone
          : `${formatNumber(row.medianDeliveryDurationMs)} ${labels.metricMs}`}
      </td>
      <td className="px-2 py-2 text-right align-middle tabular-nums">
        {row.oldestPendingAckAgeDays === null
          ? labels.metricNone
          : `${formatNumber(row.oldestPendingAckAgeDays)} ${labels.metricDays}`}
      </td>
    </tr>
  )
}
