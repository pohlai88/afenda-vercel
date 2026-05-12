"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Separator } from "#components/ui/separator"

import type { OrgEventDeliverySummary } from "#features/org-admin"

import {
  generateAllStatutoryPacksAction,
  markEvidenceSubmittedAction,
} from "../actions/compliance.actions"
import { submitStatutoryEvidenceForDeliveryAction } from "../actions/statutory-submission.actions"
import { acknowledgeStatutoryEvidenceAction } from "../actions/statutory-acknowledgement.actions"
import { organizationHrmComplianceDetailPath } from "../constants"
import { authorityForStatutoryPack } from "../data/statutory-event-types.shared"
import type {
  AcknowledgeStatutoryEvidenceFormState,
  GenerateAllStatutoryPacksFormState,
  MarkEvidenceSubmittedFormState,
  SubmitStatutoryEvidenceFormState,
} from "../types"
import type { ComplianceEvidenceRow } from "../data/compliance.queries.server"
import type { PayrollPeriodRow } from "../data/payroll.queries.server"

// ---------------------------------------------------------------------------
// Sub-state badges
// ---------------------------------------------------------------------------

const SUBMISSION_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  queued: "default",
  submitted: "outline",
  // `acknowledged` is the terminal compliance state — use the brand-primary
  // fill so it visually separates from intermediate states in dense rows.
  acknowledged: "default",
  failed: "destructive",
}

function SubmissionBadge({ state }: { state: string }) {
  const variant = SUBMISSION_BADGE[state] ?? "secondary"
  return (
    <Badge variant={variant} className="capitalize">
      {state}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Pack type display label
// ---------------------------------------------------------------------------

const PACK_TYPE_LABELS: Record<string, string> = {
  epf_monthly: "EPF Monthly",
  socso_monthly: "SOCSO Monthly",
  eis_monthly: "EIS Monthly",
  pcb_monthly: "PCB / MTD Monthly",
  ea_annual: "EA Annual",
  borang_e_annual: "Borang E Annual",
}

// ---------------------------------------------------------------------------
// Phase 3I: acknowledgement provenance display
// ---------------------------------------------------------------------------

/**
 * Renders the temporal authority signature for an acknowledged row:
 * "Acknowledged Mar 5 · KWSP · manual". Each segment falls back gracefully so
 * historical rows (pre-3I, NULL provenance) still render the canonical
 * "Acknowledged" without lying about the chronology.
 */
function AcknowledgementMeta({
  acknowledgedAt,
  acknowledgementSource,
  authorityName,
  authorityPayloadHash,
}: {
  acknowledgedAt: Date | null
  acknowledgementSource: string | null
  authorityName: string | null
  authorityPayloadHash: string | null
}) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const segments: string[] = [t("acknowledgedLabel")]
  const sourceCopy: Record<string, string> = {
    manual: t("acknowledgementSource.manual"),
    webhook: t("acknowledgementSource.webhook"),
    api: t("acknowledgementSource.api"),
    import: t("acknowledgementSource.import"),
  }
  if (acknowledgedAt) {
    segments.push(acknowledgedAt.toLocaleDateString())
  }
  if (authorityName) {
    segments.push(authorityName)
  }
  if (acknowledgementSource) {
    segments.push(sourceCopy[acknowledgementSource] ?? acknowledgementSource)
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span>{segments.join(" · ")}</span>
      {authorityPayloadHash && (
        // Phase 3J: bureau-supplied integrity hash. Surface only the first 8
        // hex chars in dense rows; the full hash is the title attr for copy /
        // tooltip. NOT a click-to-copy yet — that becomes a follow-up if HR
        // asks for it.
        <code
          className="rounded border border-border/60 bg-muted/40 px-1 font-mono text-[10px]"
          title={`${t("acknowledgementHashTooltip")}: ${authorityPayloadHash}`}
          aria-label={`${t("acknowledgementHashTooltip")}: ${authorityPayloadHash}`}
        >
          {t("acknowledgementHashLabel")} {authorityPayloadHash.slice(0, 8)}
        </code>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Generate all packs button
// ---------------------------------------------------------------------------

function GenerateAllPacksButton({
  periodId,
  disabled,
}: {
  periodId: string
  disabled: boolean
}) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const initial: GenerateAllStatutoryPacksFormState = {
    ok: false,
    code: "validation",
    message: "",
  }
  const [state, dispatch, isPending] = useActionState(
    generateAllStatutoryPacksAction,
    initial
  )

  return (
    <form action={dispatch} className="inline-flex items-center gap-3">
      <input type="hidden" name="periodId" value={periodId} />
      <Button type="submit" size="sm" disabled={disabled || isPending}>
        {isPending ? t("generating") : t("generateAll")}
      </Button>
      {state.ok && (
        <span className="text-sm text-muted-foreground">
          {t("generatedSummary", {
            count: state.count,
            version: state.rulePackVersion,
          })}
        </span>
      )}
      {!state.ok && state.message && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Mark submitted form
// ---------------------------------------------------------------------------

function MarkSubmittedForm({ evidenceId }: { evidenceId: string }) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const initial: MarkEvidenceSubmittedFormState = {
    ok: false,
    code: "validation",
    message: "",
  }
  const [state, dispatch, isPending] = useActionState(
    markEvidenceSubmittedAction,
    initial
  )

  if (state.ok) {
    return (
      <span className="text-sm text-muted-foreground">
        {t("submittedConfirmed")}
      </span>
    )
  }

  return (
    <form action={dispatch} className="inline-flex items-center gap-2">
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <input
        name="externalReference"
        placeholder={t("externalReferencePlaceholder")}
        className="h-8 w-36 rounded border border-border bg-background px-2 text-sm"
        maxLength={100}
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? t("saving") : t("markSubmitted")}
      </Button>
      {!state.ok && state.message && (
        <span className="text-xs text-destructive">{state.message}</span>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Delivery diagnostics (Phase 3F) — surfaces last attempt status, http code,
// duration, attempts, and a hover-revealable error message. All read-only:
// the underlying row is owned by `org_event_delivery`.
// ---------------------------------------------------------------------------

const ERROR_PREVIEW_MAX_CHARS = 80

function formatDuration(ms: number | null): string | null {
  if (ms == null) return null
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function DeliveryDiagnostics({
  delivery,
}: {
  delivery: OrgEventDeliverySummary
}) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const completedAt = delivery.completedAt ?? delivery.createdAt
  const completedLabel = new Date(completedAt).toLocaleString()
  const duration = formatDuration(delivery.durationMs)
  const isFailure = delivery.state === "failed" || delivery.state === "expired"

  const summaryParts: string[] = []
  if (delivery.httpStatus != null) {
    summaryParts.push(`HTTP ${delivery.httpStatus}`)
  }
  if (duration) summaryParts.push(duration)
  if (delivery.attempts > 1) {
    summaryParts.push(t("attempts", { count: delivery.attempts }))
  }
  const summaryLine = summaryParts.join(" \u00b7 ")

  return (
    <span
      className={
        isFailure
          ? "flex flex-col items-start text-xs text-destructive"
          : "flex flex-col items-start text-xs text-muted-foreground"
      }
    >
      {summaryLine && <span>{summaryLine}</span>}
      <span>{t("lastAttempt", { when: completedLabel })}</span>
      {delivery.errorMessage && (
        <span className="max-w-[24ch] truncate" title={delivery.errorMessage}>
          {delivery.errorMessage.length > ERROR_PREVIEW_MAX_CHARS
            ? `${delivery.errorMessage.slice(0, ERROR_PREVIEW_MAX_CHARS)}\u2026`
            : delivery.errorMessage}
        </span>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Send-to-bureau form (outbound delivery via org_event_delivery outbox)
// ---------------------------------------------------------------------------

function SendToBureauForm({ evidenceId }: { evidenceId: string }) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const initial: SubmitStatutoryEvidenceFormState = {
    ok: false,
    code: "validation",
    message: "",
  }
  const [state, dispatch, isPending] = useActionState(
    submitStatutoryEvidenceForDeliveryAction,
    initial
  )

  return (
    <form action={dispatch} className="inline-flex items-center gap-2">
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? t("sending") : t("sendToBureau")}
      </Button>
      {state.ok && (
        <span className="text-xs text-muted-foreground">
          {state.httpStatus
            ? t("deliveredWithStatus", { status: state.httpStatus })
            : t("delivered")}
        </span>
      )}
      {!state.ok && state.message && (
        <span className="text-xs text-destructive">{state.message}</span>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Mark acknowledged form (Phase 3H — closes the lifecycle once HR receives
// the bureau's email receipt). Optional external reference; preserved on
// the row for regulator inspection.
// ---------------------------------------------------------------------------

function MarkAcknowledgedForm({
  evidenceId,
  packLabel,
}: {
  evidenceId: string
  packLabel: string
}) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const initial: AcknowledgeStatutoryEvidenceFormState = {
    ok: false,
    code: "validation",
    message: "",
  }
  const [state, dispatch, isPending] = useActionState(
    acknowledgeStatutoryEvidenceAction,
    initial
  )

  if (state.ok) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("acknowledgedConfirmed")}
      </span>
    )
  }

  return (
    <form
      action={dispatch}
      className="inline-flex items-center gap-2"
      aria-label={t("markAcknowledgedAria", { pack: packLabel })}
    >
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <input
        name="externalReference"
        placeholder={t("acknowledgedReferencePlaceholder")}
        className="h-8 w-44 rounded border border-border bg-background px-2 text-sm"
        maxLength={128}
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? t("acknowledging") : t("markAcknowledged")}
      </Button>
      {!state.ok && state.message && (
        <span className="text-xs text-destructive">{state.message}</span>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Evidence table row
// ---------------------------------------------------------------------------

function EvidenceRow({
  row,
  endpointAvailable,
  delivery,
  orgSlug,
}: {
  row: ComplianceEvidenceRow
  endpointAvailable: boolean
  delivery: OrgEventDeliverySummary | null
  /** When provided, surfaces the Phase 3K "Inspect" drill-down link to `/hrm/compliance/{evidenceId}`. */
  orgSlug: string | null
}) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const label = PACK_TYPE_LABELS[row.packType] ?? row.packType
  const downloadHref = `/api/integrations/hrm-statutory-pack-export/${encodeURIComponent(row.id)}`
  const canSendToBureau =
    endpointAvailable &&
    (row.submissionState === "draft" || row.submissionState === "failed")
  const canAcknowledge = row.submissionState === "submitted"
  const detailHref = orgSlug
    ? organizationHrmComplianceDetailPath(orgSlug, row.id)
    : null

  return (
    <div className="flex flex-wrap items-start gap-3 py-2 text-sm">
      <span className="w-48 shrink-0 font-medium">{label}</span>
      <SubmissionBadge state={row.submissionState} />
      <span className="min-w-[8ch] flex-1 font-mono text-xs text-muted-foreground">
        {row.rulePackVersion}
      </span>
      <span className="text-xs text-muted-foreground">
        {row.generatedAt.toLocaleDateString()}
      </span>
      {delivery && <DeliveryDiagnostics delivery={delivery} />}
      <Button asChild size="sm" variant="ghost">
        <a
          href={downloadHref}
          download
          aria-label={t("downloadJsonAria", { pack: label })}
        >
          {t("downloadJson")}
        </a>
      </Button>
      {detailHref && (
        // Phase 3K: per-evidence lifecycle drill-down. Locale-aware via
        // #i18n/navigation Link; not a destructive action so prefetch
        // stays at the navigation default (off — see i18n/navigation.tsx).
        <Button asChild size="sm" variant="ghost">
          <Link
            href={detailHref}
            aria-label={t("inspectTimelineAria", { pack: label })}
          >
            {t("inspectTimeline")}
          </Link>
        </Button>
      )}
      {canSendToBureau && <SendToBureauForm evidenceId={row.id} />}
      {row.submissionState === "draft" && (
        <MarkSubmittedForm evidenceId={row.id} />
      )}
      {canAcknowledge && (
        <MarkAcknowledgedForm evidenceId={row.id} packLabel={label} />
      )}
      {row.submissionState === "acknowledged" && (
        <AcknowledgementMeta
          acknowledgedAt={row.acknowledgedAt}
          acknowledgementSource={row.acknowledgementSource}
          authorityName={authorityForStatutoryPack(row.packType)}
          authorityPayloadHash={row.authorityPayloadHash}
        />
      )}
      {row.externalReference && (
        <span className="text-xs text-muted-foreground">
          #{row.externalReference}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main compliance page component
// ---------------------------------------------------------------------------

export type CompliancePageProps = {
  period: PayrollPeriodRow | null
  evidenceRows: ComplianceEvidenceRow[]
  allPeriods: PayrollPeriodRow[]
  /**
   * Pack types whose mapped event type has at least one enabled subscribed
   * `org_event_endpoint`. Used to gate the "Send to bureau" affordance per
   * row without leaking endpoint metadata into the client.
   */
  packTypesWithSubscribedEndpoint?: readonly string[]
  /**
   * Diagnostic projections from `org_event_delivery` for evidence rows that
   * have ever been sent (Phase 3F). Indexed by `submissionDeliveryId`. Plain
   * record so it serializes across the RSC boundary.
   */
  deliveryById?: Readonly<Record<string, OrgEventDeliverySummary>>
  /**
   * Phase 3K: when supplied, each row renders an "Inspect" link to
   * `/o/{orgSlug}/dashboard/hrm/compliance/{evidenceId}` (locale-aware).
   * Optional only so older callers compile during migration; the route
   * page already passes it.
   */
  orgSlug?: string
}

export function CompliancePage({
  period,
  evidenceRows,
  allPeriods,
  packTypesWithSubscribedEndpoint = [],
  deliveryById = {},
  orgSlug,
}: CompliancePageProps) {
  const subscribedPackTypeSet = new Set<string>(packTypesWithSubscribedEndpoint)
  const t = useTranslations("Dashboard.Hrm.compliance")
  const canGenerate = period?.state === "locked"

  return (
    <div className="flex flex-col gap-6">
      {/* Header + period selector */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          {period && !canGenerate && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {t("requireLockedPeriod")}
            </p>
          )}
        </div>
        {period && (
          <GenerateAllPacksButton
            periodId={period.id}
            disabled={!canGenerate}
          />
        )}
      </div>

      {/* Period selector — lightweight native select to avoid heavy client bundle */}
      {allPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("periodSelector")}
            </CardTitle>
            <CardDescription>{t("periodSelectorDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form method="GET">
              <select
                name="periodId"
                defaultValue={period?.id ?? ""}
                onChange={(e) => {
                  const form = e.currentTarget.form
                  if (form) form.requestSubmit()
                }}
                className="h-9 w-64 rounded border border-border bg-background px-2 text-sm"
              >
                <option value="">{t("selectPeriod")}</option>
                {allPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.periodStart} — {p.periodEnd}
                  </option>
                ))}
              </select>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Evidence register */}
      {!period ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("emptyNoPeriod")}
          </CardContent>
        </Card>
      ) : evidenceRows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("emptyFinalizePeriod")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("evidenceRegister")} — {period.periodStart} to{" "}
              {period.periodEnd}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {evidenceRows.map((row) => (
                <EvidenceRow
                  key={row.id}
                  row={row}
                  endpointAvailable={subscribedPackTypeSet.has(row.packType)}
                  delivery={
                    row.submissionDeliveryId
                      ? (deliveryById[row.submissionDeliveryId] ?? null)
                      : null
                  }
                  orgSlug={orgSlug ?? null}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit footer — rule pack version info */}
      {period?.rulePackVersion && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground">
            {t("rulePackVersion")}:{" "}
            <span className="font-mono">{period.rulePackVersion}</span>
          </p>
        </>
      )}
    </div>
  )
}
