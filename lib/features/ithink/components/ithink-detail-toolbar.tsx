"use client"

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"

import {
  completeIThink,
  deleteIThink,
  deprecateIThink,
  reopenIThink,
  resolveIThink,
  snoozeIThinkOneHour,
  type DeprecateIThinkResult,
  type ResolveIThinkResult,
} from "#features/ithink/client"
import {
  inferResolveSeverityFromSignals,
  safeParsePredictions,
  type ResolveSeverity,
} from "#features/onething/client"
import type { IThinkRow } from "../types"

function PendingButton({
  label,
  pendingLabel,
  variant = "default",
  size = "sm",
  className,
}: {
  label: string
  pendingLabel: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size={size}
      variant={variant}
      disabled={pending}
      className={className}
    >
      {pending ? pendingLabel : label}
    </Button>
  )
}

type IThinkDetailToolbarProps = {
  row: IThinkRow
}

function ActionForm({
  action,
  oneThingId,
  children,
}: {
  action: (fd: FormData) => Promise<void>
  oneThingId: string
  children: React.ReactNode
}) {
  return (
    <form action={action}>
      <input type="hidden" name="oneThingId" value={oneThingId} />
      {children}
    </form>
  )
}

export function IThinkDetailToolbar({ row }: IThinkDetailToolbarProps) {
  const t = useTranslations("Dashboard.OneThing")
  const tIThink = useTranslations("IThink")
  const noteFieldId = useId()
  const proofFieldId = useId()
  const deprecateReasonId = useId()
  const resolveNoteRef = useRef<HTMLTextAreaElement | null>(null)

  const [mode, setMode] = useState<"idle" | "resolve">("idle")
  const [deprecateOpen, setDeprecateOpen] = useState(false)

  const predictions = useMemo(
    () => safeParsePredictions(row.predictions ?? null),
    [row.predictions]
  )
  const resolveSeverity = useMemo<ResolveSeverity>(
    () =>
      inferResolveSeverityFromSignals({
        impactBlocksGate: row.impact?.blocksGate,
        slipCostUsd: row.impact?.slipCostUsd,
        severity: row.severity,
        predictions,
      }),
    [row, predictions]
  )

  useEffect(() => {
    if (mode === "resolve") {
      requestAnimationFrame(() => resolveNoteRef.current?.focus())
    }
  }, [mode])

  const noteRequired = resolveSeverity !== "low"
  const showProofField =
    resolveSeverity === "high" || resolveSeverity === "critical"

  const resolveWrapped = useMemo(
    () =>
      async (
        _prev: ResolveIThinkResult | undefined,
        formData: FormData
      ): Promise<ResolveIThinkResult> => {
        const result = await resolveIThink(formData)
        if (result.ok) setMode("idle")
        return result
      },
    []
  )

  const [resolveState, resolveAction] = useActionState(
    resolveWrapped,
    undefined as ResolveIThinkResult | undefined
  )

  const deprecateWrapped = useMemo(
    () =>
      async (
        _prev: DeprecateIThinkResult | undefined,
        formData: FormData
      ): Promise<DeprecateIThinkResult> => {
        const result = await deprecateIThink(formData)
        if (result.ok) {
          setDeprecateOpen(false)
          setMode("idle")
        }
        return result
      },
    []
  )

  const [deprecateState, deprecateAction] = useActionState(
    deprecateWrapped,
    undefined as DeprecateIThinkResult | undefined
  )

  const handleFastResolve = useCallback(async (fd: FormData) => {
    await resolveIThink(fd)
  }, [])

  const isResolved = row.state === "resolved"
  const isDeprecated = row.state === "deprecated"
  const terminal = isResolved || isDeprecated

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {!terminal ? (
          <>
            {resolveSeverity !== "low" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setMode(mode === "resolve" ? "idle" : "resolve")}
                aria-expanded={mode === "resolve"}
              >
                {t("toolbar.resolve")}
              </Button>
            ) : (
              <form action={handleFastResolve} className="contents">
                <input type="hidden" name="oneThingId" value={row.id} />
                <input type="hidden" name="resolutionNote" value="" />
                <input type="hidden" name="resolutionProofJson" value="" />
                <PendingButton
                  label={t("toolbar.resolve")}
                  pendingLabel={t("pending")}
                  className="h-7 text-xs"
                />
              </form>
            )}

            <ActionForm action={completeIThink} oneThingId={row.id}>
              <Button
                type="submit"
                size="sm"
                variant="default"
                className="h-7 text-xs"
              >
                Complete
              </Button>
            </ActionForm>

            <ActionForm action={snoozeIThinkOneHour} oneThingId={row.id}>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                Snooze 1 h
              </Button>
            </ActionForm>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setDeprecateOpen(true)}
            >
              Deprecate
            </Button>
          </>
        ) : null}

        {isDeprecated ? (
          <ActionForm action={reopenIThink} oneThingId={row.id}>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
            >
              Reopen
            </Button>
          </ActionForm>
        ) : null}

        <ActionForm action={deleteIThink} oneThingId={row.id}>
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Delete
          </Button>
        </ActionForm>
      </div>

      {!terminal && mode === "resolve" && resolveSeverity !== "low" ? (
        <form action={resolveAction} className="flex flex-col gap-2">
          <input type="hidden" name="oneThingId" value={row.id} />

          <Label htmlFor={noteFieldId} className="sr-only">
            {t("toolbar.resolveNotePlaceholder")}
          </Label>
          <Textarea
            id={noteFieldId}
            name="resolutionNote"
            rows={3}
            placeholder={t("toolbar.resolveNotePlaceholder")}
            required={noteRequired}
            ref={resolveNoteRef}
            className="text-xs"
          />

          {showProofField ? (
            <>
              <Label htmlFor={proofFieldId} className="sr-only">
                {t("toolbar.resolveProofPlaceholder")}
              </Label>
              <Textarea
                id={proofFieldId}
                name="resolutionProofJson"
                rows={2}
                placeholder={t("toolbar.resolveProofPlaceholder")}
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
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {!resolveState.checks.ownerDecisionRecorded ? (
                    <li>{t("dodCheckOwnerDecisionRecorded")}</li>
                  ) : null}
                  {!resolveState.checks.evidenceAttached ? (
                    <li>{t("dodCheckEvidenceAttached")}</li>
                  ) : null}
                  {!resolveState.checks.predictionsHandled ? (
                    <li>{t("dodCheckPredictionsHandled")}</li>
                  ) : null}
                  {!resolveState.checks.consequenceClosed ? (
                    <li>{t("dodCheckConsequenceClosed")}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <PendingButton
              label={t("toolbar.resolveSubmit")}
              pendingLabel={t("pending")}
              className="h-7 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setMode("idle")}
            >
              {t("toolbar.resolveCancel")}
            </Button>
          </div>
        </form>
      ) : null}

      <Dialog open={deprecateOpen} onOpenChange={setDeprecateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tIThink("toolbar.deprecate")}</DialogTitle>
          </DialogHeader>
          <form action={deprecateAction} className="flex flex-col gap-3">
            <input type="hidden" name="oneThingId" value={row.id} />
            <div className="space-y-1.5">
              <Label
                htmlFor={deprecateReasonId}
                className="text-xs text-muted-foreground"
              >
                {t("toolbar.deprecateOpen")}
              </Label>
              <Textarea
                id={deprecateReasonId}
                name="reason"
                rows={3}
                required
                minLength={1}
                placeholder={t("toolbar.deprecateReasonPlaceholder")}
                className="text-sm"
              />
            </div>
            {deprecateState?.ok === false ? (
              <p role="alert" className="text-xs text-destructive">
                {deprecateState.code === "invalid_input"
                  ? t("deprecateErrorInvalidInput")
                  : deprecateState.code === "not_found"
                    ? t("deprecateErrorNotFound")
                    : t("deprecateErrorGeneric")}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeprecateOpen(false)}
              >
                {t("toolbar.resolveCancel")}
              </Button>
              <PendingButton
                label={t("toolbar.deprecateSubmit")}
                pendingLabel={t("pending")}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
