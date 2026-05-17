import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Badge } from "#components2/ui/badge"

import {
  authorityForStatutoryPack,
  type ComplianceTimelineEntry,
  type ComplianceTimelineKind,
} from "#features/hrm/server"

/**
 * Phase 3K ÔÇö Per-evidence operational chronology.
 *
 * Renders the composed `ComplianceTimelineEntry[]` (from
 * {@link listComplianceEvidenceTimeline}) as a vertical timeline with:
 *   - kind badge (translated label)
 *   - localized timestamp + actor
 *   - kind-aware metadata strip (delivery http status, ack source, retry
 *     attempt, hash prefixes, etc.)
 *
 * No per-row formatting reaches inline tokens ÔÇö geometry, color, and
 * spacing all flow through the design system.
 */

type ComplianceEvidenceTimelineProps = {
  entries: ComplianceTimelineEntry[]
  /** Pack type for resolving the bureau authority label on `acknowledged` rows. */
  packType: string | null
}

function shortHash(value: string | null | undefined): string | null {
  if (!value) return null
  return value.length <= 8 ? value : value.slice(0, 8)
}

function shortId(value: string | null | undefined): string | null {
  if (!value) return null
  return value.length <= 12 ? value : `${value.slice(0, 8)}ÔÇª`
}

/**
 * Visual variant selection ÔÇö calm by default; failure paths get
 * `destructive`; success paths get `default`. Keeps the inline timeline
 * scanable without color-coding every kind individually.
 */
function badgeVariantForKind(
  kind: ComplianceTimelineKind
): "default" | "secondary" | "destructive" | "outline" {
  switch (kind) {
    case "delivery_failed":
    case "retry_exhausted":
    case "aging_critical":
      // `aging_critical` is regulator-visible exposure ÔÇö same visual
      // weight as a hard delivery failure, intentionally.
      return "destructive"
    case "acknowledged":
      return "default"
    default:
      return "secondary"
  }
}

export async function ComplianceEvidenceTimeline({
  entries,
  packType,
}: ComplianceEvidenceTimelineProps) {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()])
  // `Record<ComplianceTimelineKind, string>` keeps this map in lockstep
  // with the closed kind enum ÔÇö adding a new kind without an i18n entry
  // here is a typecheck failure (the typed-messages plugin then validates
  // the catalog key in the same compile).
  const timelineKindLabels: Record<ComplianceTimelineKind, string> = {
    generated: t("Dashboard.Hrm.compliance.timeline.kind.generated"),
    submitted_to_bureau: t(
      "Dashboard.Hrm.compliance.timeline.kind.submitted_to_bureau"
    ),
    delivery_failed: t(
      "Dashboard.Hrm.compliance.timeline.kind.delivery_failed"
    ),
    retry_attempted: t(
      "Dashboard.Hrm.compliance.timeline.kind.retry_attempted"
    ),
    retry_exhausted: t(
      "Dashboard.Hrm.compliance.timeline.kind.retry_exhausted"
    ),
    aging_detected: t("Dashboard.Hrm.compliance.timeline.kind.aging_detected"),
    aging_escalated: t(
      "Dashboard.Hrm.compliance.timeline.kind.aging_escalated"
    ),
    aging_critical: t("Dashboard.Hrm.compliance.timeline.kind.aging_critical"),
    acknowledged: t("Dashboard.Hrm.compliance.timeline.kind.acknowledged"),
    pack_exported: t("Dashboard.Hrm.compliance.timeline.kind.pack_exported"),
    regenerated: t("Dashboard.Hrm.compliance.timeline.kind.regenerated"),
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">
          {t("Dashboard.Hrm.compliance.timeline.title")}
        </CardTitle>
        <CardDescription>
          {t("Dashboard.Hrm.compliance.timeline.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("Dashboard.Hrm.compliance.timeline.empty")}
          </p>
        ) : (
          <ol className="relative ml-3 border-l border-border">
            {entries.map((entry) => {
              const when = format.dateTime(entry.occurredAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })
              const actor =
                entry.actorEmail?.trim() ||
                shortId(entry.actorUserId) ||
                t("Dashboard.Hrm.compliance.timeline.actorSystem")

              return (
                <li key={entry.id} className="relative ml-4 pb-4 last:pb-0">
                  <span
                    aria-hidden
                    className="absolute top-2 -left-[1.4rem] size-2.5 rounded-full bg-foreground/40 ring-4 ring-background"
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Badge variant={badgeVariantForKind(entry.kind)}>
                      {timelineKindLabels[entry.kind]}
                    </Badge>
                    <time
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                      dateTime={entry.occurredAt.toISOString()}
                    >
                      {when}
                    </time>
                    <span className="text-xs text-muted-foreground">
                      {t("Dashboard.Hrm.compliance.timeline.actorLabel")}:{" "}
                      {actor}
                    </span>
                  </div>
                  <EntryDetails
                    entry={entry}
                    packType={packType}
                    tFacetLabels={{
                      attempts: t(
                        "Dashboard.Hrm.compliance.timeline.facet.attempts"
                      ),
                      httpStatus: t(
                        "Dashboard.Hrm.compliance.timeline.facet.httpStatus"
                      ),
                      durationMs: t(
                        "Dashboard.Hrm.compliance.timeline.facet.durationMs"
                      ),
                      authority: t(
                        "Dashboard.Hrm.compliance.timeline.facet.authority"
                      ),
                      externalReference: t(
                        "Dashboard.Hrm.compliance.timeline.facet.externalReference"
                      ),
                      authorityPayloadHash: t(
                        "Dashboard.Hrm.compliance.timeline.facet.authorityPayloadHash"
                      ),
                      inputHash: t(
                        "Dashboard.Hrm.compliance.timeline.facet.inputHash"
                      ),
                      outputHash: t(
                        "Dashboard.Hrm.compliance.timeline.facet.outputHash"
                      ),
                      packType: t(
                        "Dashboard.Hrm.compliance.timeline.facet.packType"
                      ),
                      countryCode: t(
                        "Dashboard.Hrm.compliance.timeline.facet.countryCode"
                      ),
                      rulePackVersion: t(
                        "Dashboard.Hrm.compliance.timeline.facet.rulePackVersion"
                      ),
                      retryReason: t(
                        "Dashboard.Hrm.compliance.timeline.facet.retryReason"
                      ),
                      ageDays: t(
                        "Dashboard.Hrm.compliance.timeline.facet.ageDays"
                      ),
                      stuckThresholdDays: t(
                        "Dashboard.Hrm.compliance.timeline.facet.stuckThresholdDays"
                      ),
                      tierThresholdDays: t(
                        "Dashboard.Hrm.compliance.timeline.facet.tierThresholdDays"
                      ),
                      severityTier: t(
                        "Dashboard.Hrm.compliance.timeline.facet.severityTier"
                      ),
                      format: t(
                        "Dashboard.Hrm.compliance.timeline.facet.format"
                      ),
                      responseHash: t(
                        "Dashboard.Hrm.compliance.timeline.facet.responseHash"
                      ),
                      priorInputHash: t(
                        "Dashboard.Hrm.compliance.timeline.facet.priorInputHash"
                      ),
                      priorOutputHash: t(
                        "Dashboard.Hrm.compliance.timeline.facet.priorOutputHash"
                      ),
                      priorRulePackVersion: t(
                        "Dashboard.Hrm.compliance.timeline.facet.priorRulePackVersion"
                      ),
                      priorSubmissionState: t(
                        "Dashboard.Hrm.compliance.timeline.facet.priorSubmissionState"
                      ),
                      priorExternalReference: t(
                        "Dashboard.Hrm.compliance.timeline.facet.priorExternalReference"
                      ),
                      priorAcknowledgedAt: t(
                        "Dashboard.Hrm.compliance.timeline.facet.priorAcknowledgedAt"
                      ),
                    }}
                  />
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Per-entry detail strip ÔÇö pure rendering, no client interactivity yet.
// ---------------------------------------------------------------------------

type FacetLabels = {
  attempts: string
  httpStatus: string
  durationMs: string
  authority: string
  externalReference: string
  authorityPayloadHash: string
  inputHash: string
  outputHash: string
  packType: string
  countryCode: string
  rulePackVersion: string
  retryReason: string
  /** Phase 3M facets */
  ageDays: string
  stuckThresholdDays: string
  /** Phase 3O facets */
  tierThresholdDays: string
  severityTier: string
  /** Phase 3T facets ÔÇö operator-issued export download (chain of custody). */
  format: string
  responseHash: string
  /**
   * Phase 3U facets ÔÇö provenance + lifecycle state DISCARDED on an
   * in-place regeneration. These render only on `regenerated` entries
   * and are deliberately *prior*-prefixed so they read as "what was
   * lost" alongside the post-regeneration row state on the same card.
   */
  priorInputHash: string
  priorOutputHash: string
  priorRulePackVersion: string
  priorSubmissionState: string
  priorExternalReference: string
  priorAcknowledgedAt: string
}

function EntryDetails({
  entry,
  packType,
  tFacetLabels,
}: {
  entry: ComplianceTimelineEntry
  packType: string | null
  tFacetLabels: FacetLabels
}) {
  const meta = entry.metadata ?? {}
  const facets: Array<{ label: string; value: string }> = []

  function pushString(label: string, raw: unknown): void {
    if (typeof raw === "string" && raw.trim().length > 0) {
      facets.push({ label, value: raw })
    }
  }
  function pushNumber(label: string, raw: unknown): void {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      facets.push({ label, value: String(raw) })
    }
  }
  function pushHash(label: string, raw: unknown): void {
    if (typeof raw === "string" && raw.length > 0) {
      facets.push({ label, value: shortHash(raw) ?? raw })
    }
  }

  switch (entry.kind) {
    case "generated": {
      pushString(tFacetLabels.packType, meta.packType)
      pushString(tFacetLabels.countryCode, meta.countryCode)
      pushString(tFacetLabels.rulePackVersion, meta.rulePackVersion)
      pushHash(tFacetLabels.inputHash, meta.inputHash)
      pushHash(tFacetLabels.outputHash, meta.outputHash)
      break
    }
    case "submitted_to_bureau":
    case "delivery_failed": {
      pushNumber(tFacetLabels.attempts, meta.attempts)
      pushNumber(tFacetLabels.httpStatus, meta.httpStatus)
      pushNumber(tFacetLabels.durationMs, meta.durationMs)
      break
    }
    case "retry_attempted":
    case "retry_exhausted": {
      pushNumber(tFacetLabels.attempts, meta.attempts)
      pushString(tFacetLabels.retryReason, meta.errorMessage ?? meta.reason)
      break
    }
    case "aging_detected":
    case "aging_escalated":
    case "aging_critical": {
      // System-observed tier crossing ÔÇö surface ONLY the facets HR
      // needs to understand "why am I seeing this row at THIS
      // severity". Operators read `ageDays` + `tierThresholdDays` as
      // "this row has been stuck for {ageDays}, beyond the
      // {tierThresholdDays}-day {tier} threshold." Don't include
      // `bucketBefore` / `bucketAfter` ÔÇö those are internal
      // classifier names, not regulator-readable.
      pushNumber(tFacetLabels.ageDays, meta.ageDays)
      pushNumber(
        tFacetLabels.tierThresholdDays,
        meta.tierThresholdDays ?? meta.stuckThresholdDays
      )
      pushString(tFacetLabels.severityTier, meta.severityTier)
      pushString(tFacetLabels.rulePackVersion, meta.rulePackVersion)
      break
    }
    case "acknowledged": {
      const authority =
        (typeof meta.authorityName === "string" && meta.authorityName) ||
        authorityForStatutoryPack(packType ?? "") ||
        null
      if (authority)
        facets.push({ label: tFacetLabels.authority, value: authority })
      pushString(tFacetLabels.externalReference, meta.externalReference)
      pushHash(tFacetLabels.authorityPayloadHash, meta.authorityPayloadHash)
      break
    }
    case "pack_exported": {
      // Phase 3T ÔÇö chain of custody for an operator-issued download. The
      // actor / timestamp render above; here we surface the format that
      // was downloaded plus the response hash anchor (truncated for
      // scanability ÔÇö the full hash is on the audit row in
      // `iam_audit_event.metadata.responseHash` for offline verification).
      pushString(tFacetLabels.format, meta.format)
      pushHash(tFacetLabels.responseHash, meta.responseHash)
      pushString(tFacetLabels.packType, meta.packType)
      pushString(tFacetLabels.rulePackVersion, meta.rulePackVersion)
      break
    }
    case "regenerated": {
      // Phase 3U ÔÇö surface the operationally-meaningful prior state that
      // the in-place UPDATE just discarded. We deliberately render
      // PRIOR hashes (not new ones) and the PRIOR submission +
      // acknowledgement state ÔÇö answering "the file Bob downloaded last
      // week was acknowledged by KWSP at this time; the regenerated
      // pack does NOT inherit that receipt." Hashes are truncated for
      // scanability; the full values live in `metadata.priorInputHash`
      // / `metadata.priorOutputHash` for offline verification.
      pushString(tFacetLabels.packType, meta.packType)
      pushHash(tFacetLabels.priorInputHash, meta.priorInputHash)
      pushHash(tFacetLabels.priorOutputHash, meta.priorOutputHash)
      pushString(tFacetLabels.priorRulePackVersion, meta.priorRulePackVersion)
      pushString(tFacetLabels.priorSubmissionState, meta.priorSubmissionState)
      pushString(
        tFacetLabels.priorExternalReference,
        meta.priorExternalReference
      )
      // ISO 8601 string ÔÇö regulator-readable, no localization (audit
      // chronology should be unambiguous UTC). Truncate any trailing
      // `Z` millisecond noise to keep cards calm.
      pushString(
        tFacetLabels.priorAcknowledgedAt,
        typeof meta.priorAcknowledgedAt === "string"
          ? meta.priorAcknowledgedAt.replace(/\.\d{3}Z$/u, "Z")
          : meta.priorAcknowledgedAt
      )
      break
    }
  }

  if (facets.length === 0) return null

  return (
    <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
      {facets.map((f, idx) => (
        <div key={`${entry.id}-facet-${idx}`} className="min-w-0">
          <dt className="text-muted-foreground">{f.label}</dt>
          <dd className="font-medium wrap-break-word">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
