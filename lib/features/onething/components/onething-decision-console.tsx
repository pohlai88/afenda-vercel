"use client"

import { useActionState, useMemo, useState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"

import type {
  DeprecateOneThingActionResult,
  ResolveOneThingActionResult,
  ResolveSeverity,
} from "#features/onething/client"

/**
 * OneThing decision console — structured resolve + optional deprecate.
 * Uses `useActionState` for expected-error surfaces (DoD, validation) per
 * Next.js Forms + Server Actions guidance; auth stays inside each action.
 */

type OneThingDecisionConsoleParticipant = {
  /** Stable row key when present (e.g. user id). */
  id?: string
  name: string
  role?: string
}

type OneThingDecisionConsoleRecommendedAction = {
  label: string
  rationale: string
}

type OneThingDecisionConsoleProps = {
  oneThingId: string
  /** Drives required note / proof affordances (matches ranker severity). */
  resolveSeverity?: ResolveSeverity
  recommendedAction?: OneThingDecisionConsoleRecommendedAction | null
  participants?: OneThingDecisionConsoleParticipant[]
  evidenceNeeded?: string[]
  resolveOneThing: (fd: FormData) => Promise<ResolveOneThingActionResult>
  deprecateOneThing?: (fd: FormData) => Promise<DeprecateOneThingActionResult>
  /** Fires when a structured resolve attempt starts (e.g. canvas optimistic UI). */
  onStructuredResolveStart?: () => void
}

function CommitButton({
  label,
  pendingLabel,
  variant = "default",
}: {
  label: string
  pendingLabel: string
  variant?: "default" | "outline" | "secondary" | "ghost"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

export function OneThingDecisionConsole({
  oneThingId,
  resolveSeverity = "low",
  recommendedAction,
  participants,
  evidenceNeeded,
  resolveOneThing,
  deprecateOneThing,
  onStructuredResolveStart,
}: OneThingDecisionConsoleProps) {
  const t = useTranslations("Dashboard.OneThing")
  const [consoleOpen, setConsoleOpen] = useState(false)

  const resolveWrapped = useMemo(
    () =>
      async (
        _prev: ResolveOneThingActionResult | undefined,
        formData: FormData
      ): Promise<ResolveOneThingActionResult> => {
        onStructuredResolveStart?.()
        return resolveOneThing(formData)
      },
    [onStructuredResolveStart, resolveOneThing]
  )

  const [resolveState, resolveFormAction] = useActionState(
    resolveWrapped,
    undefined as ResolveOneThingActionResult | undefined
  )

  const deprecateWrapped = useMemo(
    () =>
      async (
        _prev: DeprecateOneThingActionResult | undefined,
        formData: FormData
      ): Promise<DeprecateOneThingActionResult> => {
        if (!deprecateOneThing) return { ok: false, code: "invalid_input" }
        return deprecateOneThing(formData)
      },
    [deprecateOneThing]
  )

  const [deprecateState, deprecateFormAction] = useActionState(
    deprecateWrapped,
    undefined as DeprecateOneThingActionResult | undefined
  )

  const noteRequired = resolveSeverity !== "low"
  const showProofField =
    resolveSeverity === "medium" ||
    resolveSeverity === "high" ||
    resolveSeverity === "critical"

  const resolveErrorMessage =
    resolveState?.ok === false
      ? (() => {
          switch (resolveState.code) {
            case "invalid_input":
              return t("resolveErrorInvalidInput")
            case "not_found":
              return t("resolveErrorNotFound")
            case "bad_transition":
              return t("resolveErrorBadTransition")
            case "dod_failed":
              return t("resolveErrorDodFailed")
            default:
              return t("resolveErrorGeneric")
          }
        })()
      : null

  const deprecateErrorMessage =
    deprecateState?.ok === false
      ? (() => {
          switch (deprecateState.code) {
            case "invalid_input":
              return t("deprecateErrorInvalidInput")
            case "not_found":
              return t("deprecateErrorNotFound")
            case "bad_transition":
              return t("deprecateErrorBadTransition")
            default:
              return t("deprecateErrorGeneric")
          }
        })()
      : null

  const hasParticipants = (participants?.length ?? 0) > 0
  const hasEvidence = (evidenceNeeded?.length ?? 0) > 0
  const hasRecommended = !!recommendedAction

  if (!consoleOpen) {
    return (
      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-mono text-xs"
          onClick={() => setConsoleOpen(true)}
        >
          {t("decisionConsoleCta")}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-primary/40 bg-card p-4">
        <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          <span>{t("decisionConsoleCta")}</span>
          <button
            type="button"
            onClick={() => setConsoleOpen(false)}
            className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
          >
            esc
          </button>
        </div>

        {hasRecommended && recommendedAction ? (
          <div className="flex flex-col gap-1.5 rounded-md border bg-muted/40 px-3 py-2">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("decisionConsoleRecommended")}
            </span>
            <p className="text-sm font-medium text-foreground">
              {recommendedAction.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {recommendedAction.rationale}
            </p>
          </div>
        ) : null}

        {hasParticipants && participants ? (
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("decisionConsoleParticipants")}
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {participants.map((p, i) => (
                <li
                  key={p.id ?? `${oneThingId}-participant-${i}`}
                  className="inline-flex h-7 items-center gap-2 rounded-md border bg-card px-2.5 text-xs text-foreground"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.role ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {p.role}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasEvidence && evidenceNeeded ? (
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("decisionConsoleEvidence")}
            </span>
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {evidenceNeeded.map((e, i) => (
                <li key={`${e}:${i}`} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-primary">
                    ·
                  </span>
                  <span className="text-foreground">{e}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form action={resolveFormAction} className="flex flex-col gap-2">
          <input type="hidden" name="oneThingId" value={oneThingId} />
          <Label
            htmlFor={`decision-resolution-note-${oneThingId}`}
            className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
          >
            {t("decisionConsoleNoteLabel")}
          </Label>
          <Textarea
            id={`decision-resolution-note-${oneThingId}`}
            name="resolutionNote"
            rows={3}
            placeholder={t("decisionConsoleNotePlaceholder")}
            required={noteRequired}
          />

          {showProofField ? (
            <>
              <Label
                htmlFor={`decision-proof-${oneThingId}`}
                className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
              >
                {t("decisionConsoleProofLabel")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("decisionConsoleProofHint")}
              </p>
              <Textarea
                id={`decision-proof-${oneThingId}`}
                name="resolutionProofJson"
                rows={2}
                placeholder={t("decisionConsoleProofPlaceholder")}
                className="font-mono text-xs"
              />
            </>
          ) : (
            <input type="hidden" name="resolutionProofJson" value="" />
          )}

          {resolveErrorMessage ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <p>{resolveErrorMessage}</p>
              {resolveState?.ok === false &&
              resolveState.code === "dod_failed" &&
              resolveState.checks ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-destructive">
                  {!resolveState.checks.ownerDecisionRecorded ? (
                    <li key="owner">{t("dodCheckOwnerDecisionRecorded")}</li>
                  ) : null}
                  {!resolveState.checks.evidenceAttached ? (
                    <li key="evidence">{t("dodCheckEvidenceAttached")}</li>
                  ) : null}
                  {!resolveState.checks.predictionsHandled ? (
                    <li key="predictions">{t("dodCheckPredictionsHandled")}</li>
                  ) : null}
                  {!resolveState.checks.consequenceClosed ? (
                    <li key="consequence">{t("dodCheckConsequenceClosed")}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <CommitButton
              label={t("decisionConsoleSubmit")}
              pendingLabel={t("pending")}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConsoleOpen(false)}
            >
              {t("decisionConsoleClose")}
            </Button>
          </div>
        </form>
      </div>

      {deprecateOneThing ? (
        <details className="rounded-xl border border-border bg-card px-4 py-3">
          <summary className="cursor-pointer font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase hover:text-foreground">
            {t("decisionConsoleDeprecateSummary")}
          </summary>
          <form
            action={deprecateFormAction}
            className="mt-3 flex flex-col gap-2 border-t pt-3"
          >
            <input type="hidden" name="oneThingId" value={oneThingId} />
            <Label
              htmlFor={`decision-deprecate-${oneThingId}`}
              className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
            >
              {t("decisionConsoleDeprecateLabel")}
            </Label>
            <Textarea
              id={`decision-deprecate-${oneThingId}`}
              name="reason"
              rows={2}
              placeholder={t("decisionConsoleDeprecatePlaceholder")}
              required
            />
            {deprecateErrorMessage ? (
              <p role="alert" className="text-xs text-destructive">
                {deprecateErrorMessage}
              </p>
            ) : null}
            <div>
              <CommitButton
                label={t("decisionConsoleDeprecateSubmit")}
                pendingLabel={t("pending")}
                variant="outline"
              />
            </div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
