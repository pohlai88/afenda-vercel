"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

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
import type {
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
  acknowledged: "outline",
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
      <span>
        {t("lastAttempt", { when: completedLabel })}
      </span>
      {delivery.errorMessage && (
        <span
          className="max-w-[24ch] truncate"
          title={delivery.errorMessage}
        >
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
// Evidence table row
// ---------------------------------------------------------------------------

function EvidenceRow({
  row,
  endpointAvailable,
  delivery,
}: {
  row: ComplianceEvidenceRow
  endpointAvailable: boolean
  delivery: OrgEventDeliverySummary | null
}) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const label = PACK_TYPE_LABELS[row.packType] ?? row.packType
  const downloadHref = `/api/integrations/hrm-statutory-pack-export/${encodeURIComponent(row.id)}`
  const canSendToBureau =
    endpointAvailable &&
    (row.submissionState === "draft" || row.submissionState === "failed")

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
      {canSendToBureau && <SendToBureauForm evidenceId={row.id} />}
      {row.submissionState === "draft" && (
        <MarkSubmittedForm evidenceId={row.id} />
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
}

export function CompliancePage({
  period,
  evidenceRows,
  allPeriods,
  packTypesWithSubscribedEndpoint = [],
  deliveryById = {},
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
                      ? deliveryById[row.submissionDeliveryId] ?? null
                      : null
                  }
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
