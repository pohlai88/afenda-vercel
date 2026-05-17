import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Badge } from "#components2/ui/badge"
import { Link } from "#i18n/navigation"

import { organizationHrmComplianceDetailPath } from "../../../constants"
import { getComplianceOperationalHealthSnapshot } from "../data/compliance-operational-health.queries.server"
import {
  COMPLIANCE_OPERATIONAL_HEALTH_AGING,
  COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS,
  highestComplianceAgingTier,
  type ComplianceAgingTier,
  type ComplianceHealthAttentionBucket,
  type ComplianceHealthDisplayedBucket,
} from "../data/compliance-operational-health.shared"
import type { ComplianceHealthSampleRow } from "../data/compliance-operational-health.queries.server"

/**
 * Phase 3L ÔÇö Cross-period operational health.
 *
 * Rendered as a Tier B Suspense-streamed Server Component above the
 * existing per-period evidence register. Answers "what across the WHOLE
 * organization needs HR attention this week?" without forcing the
 * operator to click through every period.
 *
 * Doctrine:
 *   - All data is read here; never lifted into a Client Component.
 *   - Drill-downs reuse the Phase 3K per-evidence timeline route ÔÇö no
 *     parallel detail surface.
 *   - Empty-state copy is honest: "all clear" vs. "no evidence yet" are
 *     operationally distinct and rendered differently.
 */

type ComplianceOperationalHealthProps = {
  organizationId: string
  orgSlug: string
}

const PACK_TYPE_LABELS: Record<string, string> = {
  epf_monthly: "EPF Monthly",
  socso_monthly: "SOCSO Monthly",
  eis_monthly: "EIS Monthly",
  pcb_monthly: "PCB / MTD Monthly",
  ea_annual: "EA Annual",
  borang_e_annual: "Borang E Annual",
}

function packLabel(packType: string): string {
  return PACK_TYPE_LABELS[packType] ?? packType
}

/**
 * Visual variant for an attention bucket header. Failures get
 * `destructive` (regulator-visible problem); "stuck" + "unsent" use
 * `secondary` (operator-actionable but not in flames yet). Constrained
 * to displayed buckets so the never-rendered classifier outputs (e.g.
 * `closed`, `draft_unlocked_period`) cannot reach this function.
 */
function bucketBadgeVariant(
  bucket: ComplianceHealthDisplayedBucket
): "default" | "secondary" | "destructive" | "outline" {
  switch (bucket) {
    case "needs_attention_failing":
      return "destructive"
    case "needs_attention_unsent":
    case "needs_attention_stuck":
      return "secondary"
    case "closed_recently":
      return "default"
    case "in_flight":
      return "outline"
  }
}

export async function ComplianceOperationalHealth({
  organizationId,
  orgSlug,
}: ComplianceOperationalHealthProps) {
  // Single round of awaits: i18n + format + the snapshot run in parallel.
  // Sub-components receive resolved values as plain props so they stay
  // sync, predictable, and easy to test in isolation later.
  const [t, format, snapshot] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.operationalHealth"),
    getFormatter(),
    getComplianceOperationalHealthSnapshot(organizationId),
  ])

  const totalAttention = COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS.reduce(
    (sum, bucket) => sum + snapshot.bucketCounts[bucket],
    0
  )

  if (snapshot.rowsConsidered === 0) {
    // Operationally distinct from "everything is calm" ÔÇö render the
    // "no evidence has been generated yet" guidance instead of an
    // all-clear celebration.
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("emptyNoRows")}</p>
        </CardContent>
      </Card>
    )
  }

  const computedAtLabel = format.dateTime(snapshot.computedAt, {
    dateStyle: "medium",
    timeStyle: "short",
  })

  // Resolve the labels we hand to nested presentational components once,
  // up here, so we don't pay for repeated translation lookups deeper in
  // the tree (and so all literal text is locale-aware in one place).
  const labels: ComplianceHealthLabels = {
    inspect: t("inspect"),
    inspectAria: (pack: string) => t("inspectTimelineAria", { pack }),
    bucketName: (bucket) => t(`bucket.${bucket}`),
    bucketHeading: (bucket, count) => t(`bucketHeading.${bucket}`, { count }),
    bucketSubtitle: (bucket) =>
      t(`bucketSubtitle.${bucket}`, {
        stuckDays: COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS,
      }),
    samplesTruncated: (remainder) => t("samplesTruncated", { remainder }),
    age: (days) => (days === 0 ? t("ageToday") : t("ageDays", { days })),
    countersAria: t("countersAria"),
    samplesAria: (bucket) =>
      t("samplesAria", { bucket: t(`bucket.${bucket}`) }),
    agingTierName: (tier) => t(`agingTier.${tier}`),
    agingTierAria: (tier) =>
      t("agingTierAria", { tier: t(`agingTier.${tier}`) }),
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {totalAttention === 0 && (
            <Badge variant="default">{t("allClearBadge")}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/*
         * COUNTER STRIP ÔÇö every flow surfaced. Non-attention buckets
         * render as small counts even when zero so the geometry is
         * stable across snapshots (no layout shift between renders).
         */}
        <dl
          aria-label={labels.countersAria}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          <Counter
            label={labels.bucketName("needs_attention_failing")}
            value={snapshot.bucketCounts.needs_attention_failing}
            variant={
              snapshot.bucketCounts.needs_attention_failing > 0
                ? "destructive"
                : "muted"
            }
          />
          <Counter
            label={labels.bucketName("needs_attention_stuck")}
            value={snapshot.bucketCounts.needs_attention_stuck}
            variant={
              snapshot.bucketCounts.needs_attention_stuck > 0 ? "warn" : "muted"
            }
          />
          <Counter
            label={labels.bucketName("needs_attention_unsent")}
            value={snapshot.bucketCounts.needs_attention_unsent}
            variant={
              snapshot.bucketCounts.needs_attention_unsent > 0
                ? "warn"
                : "muted"
            }
          />
          <Counter
            label={labels.bucketName("in_flight")}
            value={snapshot.bucketCounts.in_flight}
            variant="muted"
          />
          <Counter
            label={labels.bucketName("closed_recently")}
            value={snapshot.bucketCounts.closed_recently}
            variant="success"
          />
        </dl>

        {/*
         * ATTENTION SECTION ÔÇö only renders if at least one attention
         * bucket has rows. Each bucket renders its own card with sample
         * rows + per-row drill-down to the Phase 3K timeline.
         */}
        {totalAttention > 0 && (
          <div className="flex flex-col gap-4">
            {COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS.map((bucket) => {
              const samples = snapshot.attentionRowSamples[bucket]
              const total = snapshot.bucketCounts[bucket]
              if (total === 0) return null
              return (
                <AttentionBucketSection
                  key={bucket}
                  bucket={bucket}
                  samples={samples}
                  totalInBucket={total}
                  orgSlug={orgSlug}
                  labels={labels}
                />
              )
            })}
          </div>
        )}

        {totalAttention === 0 && (
          <p className="text-sm text-muted-foreground">{t("allClearBody")}</p>
        )}

        {/*
         * AUDIT FOOTER ÔÇö surfaces window clamp + computation time so HR
         * (and regulators reading shared screenshots) can reason about
         * snapshot freshness.
         */}
        <p className="text-xs text-muted-foreground">
          {t("footerComputedAt", { when: computedAtLabel })}
          {" \u00b7 "}
          {snapshot.windowClamped
            ? t("footerWindowClamped", { window: snapshot.rowsConsidered })
            : t("footerWindowFull", { window: snapshot.rowsConsidered })}
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Internal label bundle ÔÇö resolved once at the parent and passed down so
// presentational sub-components stay sync + locale-correct.
// ---------------------------------------------------------------------------

type ComplianceHealthLabels = {
  inspect: string
  inspectAria: (pack: string) => string
  /** Compact bucket label used by the counter strip + attention header chip. */
  bucketName: (bucket: ComplianceHealthDisplayedBucket) => string
  /**
   * Long-form attention heading, e.g. "3 packs waiting on bureau
   * acknowledgement". Only attention buckets have this copy ÔÇö the
   * narrow type stops a typo from asking for `bucketHeading.in_flight`.
   */
  bucketHeading: (
    bucket: ComplianceHealthAttentionBucket,
    count: number
  ) => string
  /** Short policy explainer rendered under the attention heading. */
  bucketSubtitle: (bucket: ComplianceHealthAttentionBucket) => string
  samplesTruncated: (remainder: number) => string
  age: (days: number) => string
  countersAria: string
  samplesAria: (bucket: ComplianceHealthAttentionBucket) => string
  /** Phase 3O ÔÇö severity tier short label for stuck sample badges. */
  agingTierName: (tier: ComplianceAgingTier) => string
  agingTierAria: (tier: ComplianceAgingTier) => string
}

function Counter({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: "destructive" | "warn" | "success" | "muted"
}) {
  const valueClass = (() => {
    switch (variant) {
      case "destructive":
        return "text-destructive"
      case "warn":
        return "text-amber-600 dark:text-amber-400"
      case "success":
      case "muted":
      default:
        return "text-foreground"
    }
  })()
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </dd>
    </div>
  )
}

function AttentionBucketSection({
  bucket,
  samples,
  totalInBucket,
  orgSlug,
  labels,
}: {
  bucket: ComplianceHealthAttentionBucket
  samples: readonly ComplianceHealthSampleRow[]
  totalInBucket: number
  orgSlug: string
  labels: ComplianceHealthLabels
}) {
  const remainder = totalInBucket - samples.length

  return (
    <section
      aria-labelledby={`compliance-health-bucket-${bucket}`}
      className="rounded-md border border-border bg-card p-3"
    >
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={bucketBadgeVariant(bucket)}>
            {labels.bucketName(bucket)}
          </Badge>
          <h3
            id={`compliance-health-bucket-${bucket}`}
            className="text-sm font-medium"
          >
            {labels.bucketHeading(bucket, totalInBucket)}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {labels.bucketSubtitle(bucket)}
        </p>
      </header>
      <ul
        className="divide-y divide-border"
        aria-label={labels.samplesAria(bucket)}
      >
        {samples.map((row) => (
          <SampleRow
            key={row.id}
            row={row}
            bucket={bucket}
            orgSlug={orgSlug}
            labels={labels}
          />
        ))}
      </ul>
      {remainder > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {labels.samplesTruncated(remainder)}
        </p>
      )}
    </section>
  )
}

/**
 * Visual variant for a Phase 3O severity-tier badge on a stuck sample
 * row. `detected` is informational (secondary), `escalated` warrants
 * managerial follow-up (secondary, leaving destructive for true
 * regulator exposure), `critical` lights up `destructive` so it pops
 * out of the stuck list at a glance.
 */
function tierBadgeVariant(
  tier: ComplianceAgingTier
): "default" | "secondary" | "destructive" | "outline" {
  switch (tier) {
    case "critical":
      return "destructive"
    case "escalated":
    case "detected":
      return "secondary"
  }
}

function SampleRow({
  row,
  bucket,
  orgSlug,
  labels,
}: {
  row: ComplianceHealthSampleRow
  bucket: ComplianceHealthAttentionBucket
  orgSlug: string
  labels: ComplianceHealthLabels
}) {
  const label = packLabel(row.packType)
  const detailHref = organizationHrmComplianceDetailPath(orgSlug, row.id)
  // Severity tier is only meaningful for stuck rows ÔÇö `failing` and
  // `unsent` are operationally severe by classification, not by age.
  const tier =
    bucket === "needs_attention_stuck"
      ? highestComplianceAgingTier(row.ageDays)
      : null
  return (
    <li className="flex flex-wrap items-center gap-3 py-2 text-sm">
      <span className="w-44 shrink-0 font-medium">{label}</span>
      {row.periodStart && row.periodEnd && (
        <span className="text-xs text-muted-foreground">
          {row.periodStart} ÔÇö {row.periodEnd}
        </span>
      )}
      <Badge variant="outline" className="font-mono text-[10px]">
        {labels.age(row.ageDays)}
      </Badge>
      {tier && (
        <Badge
          variant={tierBadgeVariant(tier)}
          aria-label={labels.agingTierAria(tier)}
        >
          {labels.agingTierName(tier)}
        </Badge>
      )}
      <Link
        href={detailHref}
        className="ml-auto text-sm text-primary underline-offset-2 hover:underline"
        aria-label={labels.inspectAria(label)}
      >
        {labels.inspect}
      </Link>
    </li>
  )
}
