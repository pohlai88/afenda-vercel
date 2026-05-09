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
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"

import type {
  DeprecateOneThingActionResult,
  OneThingRow,
  ResolveOneThingActionResult,
  ResolveSeverity,
} from "#features/onething/client"

import { ONETHING_TOGGLE_RESOLVE_EVENT } from "./hooks/onething-shell-events"

/**
 * Detail-pane toolbar — five operational controls in a single line:
 *
 *   [resolve] · [snooze] · [comment] · [pin] · [more ⌄]
 *
 * Resolve is the primary; clicking it expands an inline note (and proof for
 * high/critical severity) instead of opening a modal. The decision console
 * is folded in here — there is no separate console screen any more.
 *
 * "More" hides the long tail (reopen, delete, purge, deprecate). Pin is
 * intentionally unwired today: the rule contract reserves the slot so the
 * pinned-row rail in the list pane has a place to ship into.
 */

export type OneThingDetailToolbarActions = {
  scope: "org" | "personal"
  /** Drives required note / proof affordances. */
  resolveSeverity: ResolveSeverity
  resolveOneThing?: (fd: FormData) => Promise<ResolveOneThingActionResult>
  deprecateOneThing?: (fd: FormData) => Promise<DeprecateOneThingActionResult>
  fastResolve?: (fd: FormData) => Promise<void>
  reopen?: (fd: FormData) => Promise<void>
  snooze?: (fd: FormData) => Promise<void>
  remove: (fd: FormData) => Promise<void>
  addComment?: (fd: FormData) => Promise<void>
  purge?: (fd: FormData) => Promise<void>
  /** Notify the page to optimistically dim the detail pane while resolving. */
  onResolveStart?: () => void
  /** Hand focus to the next ranked id once the mutation commits. */
  onResolveCommitted?: () => void
}

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

type Mode = "idle" | "resolve" | "comment" | "more"

export function OneThingDetailToolbar({
  canvas,
  actions,
}: {
  canvas: OneThingRow
  actions: OneThingDetailToolbarActions
}) {
  const t = useTranslations("Dashboard.OneThing")
  const [mode, setMode] = useState<Mode>("idle")
  const noteFieldId = useId()
  const proofFieldId = useId()
  const commentFieldId = useId()
  const resolveNoteRef = useRef<HTMLTextAreaElement | null>(null)
  const commentRef = useRef<HTMLTextAreaElement | null>(null)

  // Imperative focus on expander open — clicking the toolbar button is the
  // user-initiated gesture, so moving focus into the expanded form is the
  // expected behavior. Avoids `autoFocus` (jsx-a11y/no-autofocus).
  useEffect(() => {
    if (mode === "resolve") {
      requestAnimationFrame(() => resolveNoteRef.current?.focus())
    } else if (mode === "comment") {
      requestAnimationFrame(() => commentRef.current?.focus())
    }
  }, [mode])

  // Distributed keyboard ownership — the toolbar listens for `R` (toggle
  // resolve) and `Esc` (close any open expander) directly, so the shell
  // does not have to lift the toolbar's `mode` state. Also reacts to the
  // shared `onething:toggle-resolve` event for the rare cross-component
  // intent (e.g. shell-wide `R` while the focus is in a non-typing
  // surface).
  useEffect(() => {
    const isResolved = canvas.state === "resolved"
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true
      const tag = target.tagName
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
    }
    function toggleResolve() {
      if (isResolved) return
      if (!actions.resolveOneThing) return
      if (actions.resolveSeverity === "low") return
      setMode((m) => (m === "resolve" ? "idle" : "resolve"))
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === "Escape") {
        if (mode !== "idle") {
          e.preventDefault()
          setMode("idle")
        }
        return
      }
      if (isTyping(e.target)) return
      if (e.key.toLowerCase() === "r") {
        e.preventDefault()
        toggleResolve()
      }
    }
    function onToggleEvent() {
      toggleResolve()
    }
    document.addEventListener("keydown", onKey)
    window.addEventListener(ONETHING_TOGGLE_RESOLVE_EVENT, onToggleEvent)
    return () => {
      document.removeEventListener("keydown", onKey)
      window.removeEventListener(ONETHING_TOGGLE_RESOLVE_EVENT, onToggleEvent)
    }
  }, [mode, canvas.state, actions.resolveOneThing, actions.resolveSeverity])

  const noteRequired = actions.resolveSeverity !== "low"
  const showProofField =
    actions.resolveSeverity === "high" || actions.resolveSeverity === "critical"

  const resolveWrapped = useMemo(
    () =>
      async (
        _prev: ResolveOneThingActionResult | undefined,
        formData: FormData
      ): Promise<ResolveOneThingActionResult> => {
        if (!actions.resolveOneThing) {
          return { ok: false, code: "invalid_input" }
        }
        actions.onResolveStart?.()
        const result = await actions.resolveOneThing(formData)
        if (result.ok) {
          actions.onResolveCommitted?.()
          setMode("idle")
        }
        return result
      },
    [actions]
  )

  const [resolveState, resolveAction] = useActionState(
    resolveWrapped,
    undefined as ResolveOneThingActionResult | undefined
  )

  const deprecateWrapped = useMemo(
    () =>
      async (
        _prev: DeprecateOneThingActionResult | undefined,
        formData: FormData
      ): Promise<DeprecateOneThingActionResult> => {
        if (!actions.deprecateOneThing) {
          return { ok: false, code: "invalid_input" }
        }
        const result = await actions.deprecateOneThing(formData)
        if (result.ok) {
          actions.onResolveCommitted?.()
          setMode("idle")
        }
        return result
      },
    [actions]
  )

  const [deprecateState, deprecateAction] = useActionState(
    deprecateWrapped,
    undefined as DeprecateOneThingActionResult | undefined
  )

  const handleFastResolve = useCallback(
    async (fd: FormData) => {
      if (actions.fastResolve) {
        actions.onResolveStart?.()
        await actions.fastResolve(fd)
        actions.onResolveCommitted?.()
      }
    },
    [actions]
  )

  const isResolved = canvas.state === "resolved"
  const isDeprecated = canvas.state === "deprecated"

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

  // For resolved / deprecated rows we only expose Reopen + Delete behind More.
  if (isDeprecated) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {!isResolved ? (
          actions.resolveSeverity !== "low" && actions.resolveOneThing ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setMode(mode === "resolve" ? "idle" : "resolve")}
              aria-expanded={mode === "resolve"}
            >
              {t("toolbar.resolve")}
            </Button>
          ) : (
            <form action={handleFastResolve}>
              <input type="hidden" name="oneThingId" value={canvas.id} />
              <PendingButton
                label={t("toolbar.resolve")}
                pendingLabel={t("pending")}
              />
            </form>
          )
        ) : null}

        {!isResolved && actions.snooze ? (
          <form action={actions.snooze}>
            <input type="hidden" name="oneThingId" value={canvas.id} />
            <PendingButton
              label={t("toolbar.snooze")}
              pendingLabel={t("pending")}
              variant="ghost"
            />
          </form>
        ) : null}

        {actions.scope === "org" && actions.addComment ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode(mode === "comment" ? "idle" : "comment")}
            aria-expanded={mode === "comment"}
          >
            {t("toolbar.comment")}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMode(mode === "more" ? "idle" : "more")}
          aria-expanded={mode === "more"}
          className="ml-auto text-muted-foreground"
        >
          {t("toolbar.more")}
        </Button>
      </div>

      {mode === "resolve" && actions.resolveOneThing ? (
        <form action={resolveAction} className="flex flex-col gap-3">
          <input type="hidden" name="oneThingId" value={canvas.id} />

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
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("idle")}
            >
              {t("toolbar.resolveCancel")}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "comment" && actions.addComment ? (
        <form action={actions.addComment} className="flex flex-col gap-2">
          <input type="hidden" name="oneThingId" value={canvas.id} />
          <Label htmlFor={commentFieldId} className="sr-only">
            {t("toolbar.comment")}
          </Label>
          <Textarea
            id={commentFieldId}
            name="body"
            rows={2}
            placeholder={t("commentPlaceholder")}
            required
            ref={commentRef}
          />
          <div className="flex items-center gap-2">
            <PendingButton
              label={t("addComment")}
              pendingLabel={t("pending")}
              variant="outline"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("idle")}
            >
              {t("toolbar.commentClose")}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "more" ? (
        <div className="flex flex-col gap-3 border-t border-border/40 pt-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {isResolved && actions.reopen ? (
              <form action={actions.reopen}>
                <input type="hidden" name="oneThingId" value={canvas.id} />
                <PendingButton
                  label={t("toolbar.moreReopen")}
                  pendingLabel={t("pending")}
                  variant="outline"
                />
              </form>
            ) : null}

            <form action={actions.remove}>
              <input type="hidden" name="oneThingId" value={canvas.id} />
              <PendingButton
                label={t("toolbar.moreDelete")}
                pendingLabel={t("pending")}
                variant="ghost"
              />
            </form>

            {actions.purge ? (
              <form action={actions.purge}>
                <PendingButton
                  label={t("toolbar.morePurge")}
                  pendingLabel={t("pending")}
                  variant="outline"
                />
              </form>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("idle")}
              className="ml-auto"
            >
              {t("toolbar.moreClose")}
            </Button>
          </div>

          {!isResolved && actions.deprecateOneThing ? (
            <form
              action={deprecateAction}
              className="flex flex-col gap-2 border-t border-border/40 pt-3"
            >
              <input type="hidden" name="oneThingId" value={canvas.id} />
              <Label
                htmlFor={`deprecate-${canvas.id}`}
                className="text-xs text-muted-foreground"
              >
                {t("toolbar.deprecateOpen")}
              </Label>
              <Textarea
                id={`deprecate-${canvas.id}`}
                name="reason"
                rows={2}
                placeholder={t("toolbar.deprecateReasonPlaceholder")}
                required
              />
              {deprecateErrorMessage ? (
                <p role="alert" className="text-xs text-destructive">
                  {deprecateErrorMessage}
                </p>
              ) : null}
              <div>
                <PendingButton
                  label={t("toolbar.deprecateSubmit")}
                  pendingLabel={t("pending")}
                  variant="outline"
                />
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
