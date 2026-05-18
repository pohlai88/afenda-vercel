"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"
import { Button } from "#components2/ui/button"

import { markEvidenceSubmittedAction } from "../actions/compliance.actions"
import { submitStatutoryEvidenceForDeliveryAction } from "../actions/statutory-submission.actions"
import { acknowledgeStatutoryEvidenceAction } from "../actions/statutory-acknowledgement.actions"
import { organizationHrmComplianceDetailPath } from "../../../constants"
import { authorityForStatutoryPack } from "../data/statutory-event-types.shared"
import { compliancePackTypeLabel } from "../data/compliance-pack-labels.shared"
import type {
  AcknowledgeStatutoryEvidenceFormState,
  MarkEvidenceSubmittedFormState,
  SubmitStatutoryEvidenceFormState,
} from "../../../types"

export type ComplianceEvidenceRegisterTrailingRow = {
  readonly id: string
  readonly packType: string
  readonly submissionState: string
  readonly rulePackVersion: string
  readonly generatedAtIso: string
  readonly externalReference: string | null
  readonly acknowledgedAtIso: string | null
  readonly acknowledgementSource: string | null
  readonly authorityPayloadHash: string | null
  readonly endpointAvailable: boolean
  readonly delivery: {
    readonly state: string
    readonly httpStatus: number | null
    readonly durationMs: number | null
    readonly attempts: number
    readonly errorMessage: string | null
    readonly completedAtIso: string
  } | null
}

type ComplianceEvidenceRegisterTrailingProps = {
  row: ComplianceEvidenceRegisterTrailingRow
  orgSlug: string | null
}

const ERROR_PREVIEW_MAX_CHARS = 80

function formatDuration(ms: number | null): string | null {
  if (ms == null) return null
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function DeliveryDiagnostics({
  delivery,
}: {
  delivery: NonNullable<ComplianceEvidenceRegisterTrailingRow["delivery"]>
}) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const completedLabel = new Date(delivery.completedAtIso).toLocaleString()
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

  return (
    <span
      className={
        isFailure
          ? "flex flex-col items-start text-xs text-destructive"
          : "flex flex-col items-start text-xs text-muted-foreground"
      }
    >
      {summaryParts.length > 0 ? <span>{summaryParts.join(" · ")}</span> : null}
      <span>{t("lastAttempt", { when: completedLabel })}</span>
      {delivery.errorMessage ? (
        <span className="max-w-[24ch] truncate" title={delivery.errorMessage}>
          {delivery.errorMessage.length > ERROR_PREVIEW_MAX_CHARS
            ? `${delivery.errorMessage.slice(0, ERROR_PREVIEW_MAX_CHARS)}…`
            : delivery.errorMessage}
        </span>
      ) : null}
    </span>
  )
}

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
    <form action={dispatch} className="flex flex-col gap-2">
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <input
        name="externalReference"
        placeholder={t("externalReferencePlaceholder")}
        className="h-8 w-full rounded border border-border bg-background px-2 text-sm"
        maxLength={100}
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? t("saving") : t("markSubmitted")}
      </Button>
      {!state.ok && state.message ? (
        <span className="text-xs text-destructive">{state.message}</span>
      ) : null}
    </form>
  )
}

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
    <form action={dispatch} className="flex flex-col gap-2">
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <Button type="submit" size="sm" disabled={isPending} className="w-fit">
        {isPending ? t("sending") : t("sendToBureau")}
      </Button>
      {state.ok ? (
        <span className="text-xs text-muted-foreground">
          {state.httpStatus
            ? t("deliveredWithStatus", { status: state.httpStatus })
            : t("delivered")}
        </span>
      ) : null}
      {!state.ok && state.message ? (
        <span className="text-xs text-destructive">{state.message}</span>
      ) : null}
    </form>
  )
}

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
      className="flex flex-col gap-2"
      aria-label={t("markAcknowledgedAria", { pack: packLabel })}
    >
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <input
        name="externalReference"
        placeholder={t("acknowledgedReferencePlaceholder")}
        className="h-8 w-full rounded border border-border bg-background px-2 text-sm"
        maxLength={128}
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? t("acknowledging") : t("markAcknowledged")}
      </Button>
      {!state.ok && state.message ? (
        <span className="text-xs text-destructive">{state.message}</span>
      ) : null}
    </form>
  )
}

function AcknowledgementMeta({
  acknowledgedAtIso,
  acknowledgementSource,
  authorityName,
  authorityPayloadHash,
}: {
  acknowledgedAtIso: string | null
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
  if (acknowledgedAtIso) {
    segments.push(new Date(acknowledgedAtIso).toLocaleDateString())
  }
  if (authorityName) {
    segments.push(authorityName)
  }
  if (acknowledgementSource) {
    segments.push(sourceCopy[acknowledgementSource] ?? acknowledgementSource)
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{segments.join(" · ")}</span>
      {authorityPayloadHash ? (
        <code
          className="rounded border border-border/60 bg-muted/40 px-1 font-mono text-[10px]"
          title={`${t("acknowledgementHashTooltip")}: ${authorityPayloadHash}`}
        >
          {t("acknowledgementHashLabel")} {authorityPayloadHash.slice(0, 8)}
        </code>
      ) : null}
    </span>
  )
}

export function ComplianceEvidenceRegisterTrailing({
  row,
  orgSlug,
}: ComplianceEvidenceRegisterTrailingProps) {
  const t = useTranslations("Dashboard.Hrm.compliance")
  const label = compliancePackTypeLabel(row.packType)
  const downloadHref = `/api/integrations/hrm-statutory-pack-export/${encodeURIComponent(row.id)}`
  const canSendToBureau =
    row.endpointAvailable &&
    (row.submissionState === "draft" || row.submissionState === "failed")
  const canAcknowledge = row.submissionState === "submitted"
  const detailHref = orgSlug
    ? organizationHrmComplianceDetailPath(orgSlug, row.id)
    : null

  return (
    <div className="flex min-w-[14rem] flex-col gap-2">
      {row.delivery ? <DeliveryDiagnostics delivery={row.delivery} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="ghost">
          <a
            href={downloadHref}
            download
            aria-label={t("downloadJsonAria", { pack: label })}
          >
            {t("downloadJson")}
          </a>
        </Button>
        {detailHref ? (
          <Button asChild size="sm" variant="ghost">
            <Link
              href={detailHref}
              aria-label={t("inspectTimelineAria", { pack: label })}
            >
              {t("inspectTimeline")}
            </Link>
          </Button>
        ) : null}
      </div>
      {canSendToBureau ? <SendToBureauForm evidenceId={row.id} /> : null}
      {row.submissionState === "draft" ? (
        <MarkSubmittedForm evidenceId={row.id} />
      ) : null}
      {canAcknowledge ? (
        <MarkAcknowledgedForm evidenceId={row.id} packLabel={label} />
      ) : null}
      {row.submissionState === "acknowledged" ? (
        <AcknowledgementMeta
          acknowledgedAtIso={row.acknowledgedAtIso}
          acknowledgementSource={row.acknowledgementSource}
          authorityName={authorityForStatutoryPack(row.packType)}
          authorityPayloadHash={row.authorityPayloadHash}
        />
      ) : null}
      {row.externalReference ? (
        <span className="text-xs text-muted-foreground">
          #{row.externalReference}
        </span>
      ) : null}
    </div>
  )
}
