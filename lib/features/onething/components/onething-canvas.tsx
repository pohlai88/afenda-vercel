"use client"

import {
  useActionState,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { useOptionalLynxSummon } from "#components/dashboard/lynx-summon-context"
import type { LynxGroundingChip } from "#components/dashboard/lynx-summon-context"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"

import {
  addOrgOneThingComment,
  completeOrgOneThing,
  completePersonalOneThing,
  createOrgOneThing,
  createPersonalOneThing,
  deleteOrgOneThing,
  deletePersonalOneThing,
  deprecateOrgOneThing,
  deprecatePersonalOneThing,
  inferResolveSeverityFromSignals,
  purgeResolvedOrgOneThing,
  reopenOrgOneThing,
  resolveOrgOneThing,
  resolvePersonalOneThing,
  safeParsePredictions,
  snoozeOrgOneThingOneHour,
  type CreateOrgOneThingFormState,
  type DeprecateOneThingActionResult,
  type OneThingCounterparty,
  type OneThingLinkageEntityRef,
  type OneThingRow,
  type ResolveOneThingActionResult,
} from "#features/onething/client"
import { OneThingDecisionConsole } from "./onething-decision-console"

/**
 * Operational atom canvas — one onething, full attention.
 *
 * The canvas does not own a list. The page-level RSC composition picks the
 * single most-unblocking onething via `rankOneThingForCanvas` and passes it in. This
 * component is a presenter for that pick plus the keyboard-first capture row.
 *
 * Design contract (`docs/design-system/operational-onething-shell.html`):
 * - Why-now strip explains the canvas pick in one sentence
 * - Linkage chips, counter-party line, and impact stats are first-class body
 *   content — not collapsed metadata
 * - Resolve actions are inline buttons, never menus
 * - Press `c` to open the capture row; `Esc` closes it
 *
 * Action contracts are unchanged; only the UI moves.
 */

type ScopeKind = "org" | "personal"

type CanvasActions = {
  create: (
    prev: CreateOrgOneThingFormState,
    fd: FormData
  ) => Promise<CreateOrgOneThingFormState>
  complete: (fd: FormData) => Promise<void>
  reopen?: (fd: FormData) => Promise<void>
  snooze?: (fd: FormData) => Promise<void>
  remove: (fd: FormData) => Promise<void>
  addComment?: (fd: FormData) => Promise<void>
  purge?: (fd: FormData) => Promise<void>
  /** Structured OneThing resolve (DoD + audit) — optional fast path keeps `complete`. */
  resolveOneThing?: (fd: FormData) => Promise<ResolveOneThingActionResult>
  deprecateOneThing?: (fd: FormData) => Promise<DeprecateOneThingActionResult>
}

type OneThingCanvasProps = {
  scope: ScopeKind
  /** The picked atom — `null` when the queue is empty. */
  canvas: OneThingRow | null
  /** Single computed sentence explaining the canvas pick. */
  whyNow: string
  defaultListId: string
  /** RSC-seeded JSON-encoded payloads for the capture row's hidden inputs. */
  captureSeed?: {
    linkage?: string
    counterparty?: string
    provenance?: string
    impact?: string
  }
  /** Pre-formatted human consequence of the seeded linkage (for the capture meta line). */
  captureSeedSummary?: string
  /** Whether the admin "purge resolved" row is visible (org only). */
  canAdmin?: boolean
}

function SubmitButton({
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

/** "2h 14m" / "30m" / "3d 4h" — compact, deterministic. */
function formatHorizon(msUntil: number): string {
  const HOUR = 60 * 60 * 1000
  const DAY = 24 * HOUR
  const abs = Math.abs(msUntil)
  if (abs < 60_000) return "<1m"
  if (abs < HOUR) return `${Math.round(abs / 60_000)}m`
  if (abs < DAY) {
    const h = Math.floor(abs / HOUR)
    const m = Math.round((abs - h * HOUR) / 60_000)
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }
  const d = Math.floor(abs / DAY)
  const h = Math.round((abs - d * DAY) / HOUR)
  return h === 0 ? `${d}d` : `${d}d ${h}h`
}

function formatUsd(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`
  return `$${Math.round(usd)}`
}

function counterPartySentence(
  cp: OneThingCounterparty,
  unknownParty: string
): {
  text: string
  external: boolean
} {
  const trimmed = cp.displayName?.trim() || cp.userId?.trim() || ""
  const displayName = trimmed || unknownParty
  switch (cp.direction) {
    case "you-owe":
      return { text: `You owe this to ${displayName}`, external: !!cp.external }
    case "owes-you":
      return { text: `${displayName} owes you`, external: !!cp.external }
    case "shared":
      return { text: `Shared with ${displayName}`, external: !!cp.external }
    case "system":
      return {
        text: `Owed to a process${trimmed ? ` · ${trimmed}` : ""}`,
        external: false,
      }
  }
}

function LinkageChip({ entity }: { entity: OneThingLinkageEntityRef }) {
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-md border bg-card px-2.5 text-xs text-foreground">
      <span className="font-mono text-[10px] font-semibold tracking-wider text-primary">
        {entity.module}
      </span>
      <span className="font-medium">{entity.label ?? entity.id}</span>
      {entity.meta ? (
        <span className="font-mono text-[10px] text-muted-foreground">
          {entity.meta}
        </span>
      ) : null}
    </span>
  )
}

export function OneThingCanvas({
  scope,
  canvas,
  whyNow,
  defaultListId,
  captureSeed,
  captureSeedSummary,
  canAdmin = false,
}: OneThingCanvasProps) {
  const t = useTranslations("Dashboard.OneThing")

  const actions = useMemo<CanvasActions>(() => {
    if (scope === "personal") {
      return {
        create: createPersonalOneThing,
        complete: completePersonalOneThing,
        remove: deletePersonalOneThing,
        resolveOneThing: resolvePersonalOneThing,
        deprecateOneThing: deprecatePersonalOneThing,
      }
    }
    return {
      create: createOrgOneThing,
      complete: completeOrgOneThing,
      reopen: reopenOrgOneThing,
      snooze: snoozeOrgOneThingOneHour,
      remove: deleteOrgOneThing,
      addComment: addOrgOneThingComment,
      purge: canAdmin ? purgeResolvedOrgOneThing : undefined,
      resolveOneThing: resolveOrgOneThing,
      deprecateOneThing: deprecateOrgOneThing,
    }
  }, [scope, canAdmin])

  const [captureOpen, setCaptureOpen] = useState(false)
  const captureInputRef = useRef<HTMLInputElement | null>(null)
  const captureFormRef = useRef<HTMLFormElement | null>(null)

  // Wrap the create action so a successful submission resets the capture row
  // as part of the action transition (avoids a setState-in-effect cascade).
  const wrappedCreate = useMemo<
    (
      prev: CreateOrgOneThingFormState,
      fd: FormData
    ) => Promise<CreateOrgOneThingFormState>
  >(
    () => async (prev, fd) => {
      const next = await actions.create(prev, fd)
      if (next?.ok) {
        setCaptureOpen(false)
        captureFormRef.current?.reset()
      }
      return next
    },
    [actions]
  )

  const [createState, createAction] = useActionState<
    CreateOrgOneThingFormState,
    FormData
  >(wrappedCreate, undefined)

  // Optimistic resolve state — shows the OneThing "resolving" surface while
  // the Server Action runs, then collapses on RSC revalidation. Per the
  // OneThing client-state plan: scoped to this form's transition; not a
  // global store, not a parallel cache of `canvas.state`.
  //
  // The optimistic value is intentionally a discriminated union ("idle" |
  // "resolving") rather than a mirror of `canvas.state` because:
  //   - resolve advances the canvas to the next most-unblocking atom on
  //     revalidation, so mirroring `canvas.state` would mean tracking a
  //     value that no longer points to the same record
  //   - "resolving" is the ADR-0001 operational state name for the in-flight
  //     window between Resolve click and server confirmation
  const [resolveOptimistic, beginOptimisticResolve] = useOptimistic<
    "idle" | "resolving",
    "resolving"
  >("idle", (_current, next) => next)

  const handleResolve = useMemo<(fd: FormData) => Promise<void>>(
    () => async (fd) => {
      beginOptimisticResolve("resolving")
      await actions.complete(fd)
    },
    [actions, beginOptimisticResolve]
  )

  // Keyboard shortcuts — `c` to open capture, `Esc` to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable

      if (e.key === "Escape" && captureOpen) {
        setCaptureOpen(false)
        e.preventDefault()
        return
      }
      if (isTyping) return
      if ((e.key === "c" || e.key === "C") && !captureOpen) {
        setCaptureOpen(true)
        e.preventDefault()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
    }
  }, [captureOpen])

  // Focus the capture input when it opens.
  useEffect(() => {
    if (captureOpen) {
      // requestAnimationFrame avoids a stale ref on the first open
      requestAnimationFrame(() => captureInputRef.current?.focus())
    }
  }, [captureOpen])

  const captureFieldId = useId()

  // Time anchor for due-date horizons. `useSyncExternalStore` with a no-op
  // subscribe and `getSnapshot: () => Date.now()` is invalid — React may call
  // `getSnapshot` repeatedly; differing values force infinite re-renders
  // ("Maximum update depth" / `forceStoreRerender`). Seed 0 for SSR, then set
  // once on the client after layout.
  const [now, setNow] = useState(0)
  useLayoutEffect(() => {
    queueMicrotask(() => {
      setNow(Date.now())
    })
  }, [])
  const dueAtMs = canvas?.dueAt ? canvas.dueAt.getTime() : null

  // Derived presentation values for the canvas pick.
  const unknownPartyLabel = t("counterpartyUnknown")

  const canvasView = useMemo(() => {
    if (!canvas) return null
    const horizonMs =
      canvas.impact?.slaHorizonMs ??
      (dueAtMs != null && now > 0 ? dueAtMs - now : null)
    const cp = canvas.counterparty
    const cpView = cp ? counterPartySentence(cp, unknownPartyLabel) : null
    return { horizonMs, cpView }
  }, [canvas, dueAtMs, now, unknownPartyLabel])

  const resolveSeverity = useMemo(() => {
    if (!canvas) return "low" as const
    return inferResolveSeverityFromSignals({
      impactBlocksGate: canvas.impact?.blocksGate,
      slipCostUsd: canvas.impact?.slipCostUsd,
      severity: canvas.severity,
      predictions: safeParsePredictions(canvas.predictions),
    })
  }, [canvas])

  // Register the open atom as the active Lynx grounding so the floating
  // summon drawer's feed runs against this onething's context. No-op outside
  // the dashboard shell (e.g. personal account routes) — the optional hook
  // returns null and the effect short-circuits.
  //
  // Important: do not depend on the full context value from
  // `useOptionalLynxSummon()` — `setGrounding` updates `grounding`, which
  // rebuilds the provider memo value, so the context object identity changes
  // every time and would retrigger this effect forever ("Maximum update depth").
  const setGrounding = useOptionalLynxSummon()?.setGrounding
  const lynxGroundingSig = useMemo(
    () =>
      !canvas
        ? ""
        : JSON.stringify({
            id: canvas.id,
            title: canvas.title,
            summary: canvas.consequence ?? null,
            entities: (canvas.linkage?.entities ?? []).slice(0, 3),
          }),
    [canvas]
  )

  useEffect(() => {
    if (!setGrounding) return
    if (lynxGroundingSig === "") {
      setGrounding(null)
      return
    }
    const c = canvas
    if (!c) {
      setGrounding(null)
      return
    }
    const chips: LynxGroundingChip[] = (c.linkage?.entities ?? [])
      .slice(0, 3)
      .map((ref) => ({
        module: ref.module,
        label: ref.label ?? ref.id,
        meta: ref.meta,
      }))
    setGrounding({
      source: "onething",
      id: c.id,
      title: c.title,
      summary: c.consequence ?? null,
      chips,
    })
    return () => {
      setGrounding(null)
    }
    // `canvas` is read from closure; `lynxGroundingSig` keys the effect so we
    // avoid unstable RSC props identity and the mutable Lynx context object.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [setGrounding, lynxGroundingSig])

  return (
    <section
      className="flex flex-col gap-6"
      aria-label={t("ariaConsequenceList")}
    >
      {!captureOpen ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            onClick={() => setCaptureOpen(true)}
          >
            {t("captureNewCta")}
          </Button>
        </div>
      ) : null}

      {/* Capture row — atom-shaped, inline, RSC seeds the linkage. */}
      {captureOpen ? (
        <form
          ref={captureFormRef}
          action={createAction}
          className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/40 bg-card p-4"
        >
          <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            <span>{t("captureHeader")}</span>
            <button
              type="button"
              onClick={() => setCaptureOpen(false)}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
            >
              esc
            </button>
          </div>

          <input type="hidden" name="listId" value={defaultListId} />
          {captureSeed?.linkage ? (
            <input type="hidden" name="linkage" value={captureSeed.linkage} />
          ) : null}
          {captureSeed?.counterparty ? (
            <input
              type="hidden"
              name="counterparty"
              value={captureSeed.counterparty}
            />
          ) : null}
          {captureSeed?.provenance ? (
            <input
              type="hidden"
              name="provenance"
              value={captureSeed.provenance}
            />
          ) : null}
          {captureSeed?.impact ? (
            <input type="hidden" name="impact" value={captureSeed.impact} />
          ) : null}

          <Label htmlFor={`${captureFieldId}-title`} className="sr-only">
            {t("titleLabel")}
          </Label>
          <Input
            id={`${captureFieldId}-title`}
            name="title"
            ref={captureInputRef}
            placeholder={t("capturePlaceholder")}
            required
            autoComplete="off"
            className="h-10 border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
          />
          {createState && !createState.ok && createState.errors?.title ? (
            <p className="text-xs text-destructive">
              {createState.errors.title}
            </p>
          ) : null}

          {captureSeedSummary ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              {captureSeedSummary}
            </p>
          ) : null}

          {createState && !createState.ok && createState.errors?.form ? (
            <p className="text-xs text-destructive">
              {createState.errors.form}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <SubmitButton
              label={t("addConsequence")}
              pendingLabel={t("pending")}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCaptureOpen(false)}
            >
              {t("captureCancel")}
            </Button>
          </div>
        </form>
      ) : null}

      {canvas ? (
        <article
          className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-elevation-1"
          aria-label={canvas.title}
        >
          {/* Why-now strip — the literal explanation for why this is the canvas pick. */}
          <div className="inline-flex max-w-full items-center gap-3 self-start rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs leading-snug text-primary">
            <span className="rounded-sm bg-background/40 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-widest uppercase">
              {t("whyNowLabel")}
            </span>
            <span className="text-foreground">{whyNow}</span>
          </div>

          {/* Provenance line — small, monospace, where the atom came from. */}
          {canvas.provenance ? (
            <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              <span className="text-primary">
                {canvas.provenance.kind}
                {canvas.provenance.source
                  ? ` · ${canvas.provenance.source}`
                  : ""}
              </span>
              {canvas.provenance.note ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{canvas.provenance.note}</span>
                </>
              ) : null}
              {typeof canvas.provenance.confidence === "number" ? (
                <>
                  <span aria-hidden>·</span>
                  <span>conf {canvas.provenance.confidence.toFixed(2)}</span>
                </>
              ) : null}
            </p>
          ) : null}

          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {canvas.title}
          </h1>

          {/* Counter-party line — multi-party choreography first-class. */}
          {canvasView?.cpView ? (
            <p className="text-sm text-foreground">
              <span className="text-foreground">{canvasView.cpView.text}</span>
              {canvas.counterparty?.role ? (
                <span className="ml-2 text-muted-foreground">
                  · {canvas.counterparty.role}
                </span>
              ) : null}
              {canvasView.cpView.external ? (
                <span className="ml-2 inline-block rounded-sm bg-muted px-1.5 py-0.5 align-middle font-mono text-[9.5px] tracking-widest text-muted-foreground uppercase">
                  {t("externalBadge")}
                </span>
              ) : null}
              {canvasView.horizonMs != null ? (
                <span className="ml-3 font-mono text-xs tracking-wide text-muted-foreground">
                  {canvasView.horizonMs < 0
                    ? t("overdueBy", {
                        time: formatHorizon(canvasView.horizonMs),
                      })
                    : t("dueIn", { time: formatHorizon(canvasView.horizonMs) })}
                </span>
              ) : null}
            </p>
          ) : canvasView?.horizonMs != null ? (
            <p className="font-mono text-xs tracking-wide text-muted-foreground">
              {canvasView.horizonMs < 0
                ? t("overdueBy", { time: formatHorizon(canvasView.horizonMs) })
                : t("dueIn", { time: formatHorizon(canvasView.horizonMs) })}
            </p>
          ) : null}

          {/* Linkage chips — the body of the onething, not metadata. */}
          {canvas.linkage?.entities && canvas.linkage.entities.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {canvas.linkage.entities.map((entity, i) => (
                <LinkageChip
                  key={`${entity.module}:${entity.id}:${i}`}
                  entity={entity}
                />
              ))}
            </div>
          ) : null}

          {/* Impact summary — what completing this unblocks. */}
          {canvas.impact &&
          (canvas.impact.unblocks != null ||
            canvas.impact.slipCostUsd != null ||
            canvas.impact.slaHorizonMs != null ||
            canvas.impact.blocksGate) ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("impactLabel")}
              </span>
              {canvas.impact.unblocks != null ? (
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="font-mono text-base font-semibold text-foreground">
                    {canvas.impact.unblocks}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    {t("impactUnblocks")}
                  </span>
                </span>
              ) : null}
              {canvas.impact.slipCostUsd != null ? (
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="font-mono text-base font-semibold text-destructive">
                    {formatUsd(canvas.impact.slipCostUsd)}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    {t("impactSlipCost")}
                  </span>
                </span>
              ) : null}
              {canvas.impact.slaHorizonMs != null ? (
                <span className="inline-flex items-baseline gap-1.5">
                  <span
                    className={`font-mono text-base font-semibold ${
                      canvas.impact.slaHorizonMs < 0
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {formatHorizon(canvas.impact.slaHorizonMs)}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    {t("impactSla")}
                  </span>
                </span>
              ) : null}
              {canvas.impact.blocksGate ? (
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {canvas.impact.blocksGate}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    {t("impactBlocksGate")}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Decision console — governed resolve + deprecate (Server Actions + useActionState).
              key resets all console state (open, errors) when the canvas atom changes. */}
          {canvas.state !== "resolved" &&
          canvas.state !== "deprecated" &&
          actions.resolveOneThing ? (
            <OneThingDecisionConsole
              key={canvas.id}
              oneThingId={canvas.id}
              resolveSeverity={resolveSeverity}
              resolveOneThing={actions.resolveOneThing}
              deprecateOneThing={actions.deprecateOneThing}
              onStructuredResolveStart={() =>
                beginOptimisticResolve("resolving")
              }
            />
          ) : null}

          {/* Resolve actions — large, inline, primary; not menus. While the
              Resolve action is in flight, swap the row for a calm "closing
              the loop" indicator (driven by `useOptimistic`) so the operator
              gets immediate confirmation that the decision was committed
              before the canvas advances to the next atom. */}
          {resolveOptimistic === "resolving" ? (
            <div
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-3 self-start rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground"
            >
              <span
                aria-hidden
                className="inline-block size-2 animate-pulse rounded-full bg-primary"
              />
              <span>{t("resolvingLabel")}</span>
            </div>
          ) : (
            <div
              role="group"
              aria-label={t("resolveLabel")}
              className="flex flex-wrap gap-2"
            >
              {canvas.state !== "resolved" ? (
                <form action={handleResolve}>
                  <input type="hidden" name="oneThingId" value={canvas.id} />
                  <SubmitButton
                    label={t("complete")}
                    pendingLabel={t("pending")}
                  />
                </form>
              ) : actions.reopen ? (
                <form action={actions.reopen}>
                  <input type="hidden" name="oneThingId" value={canvas.id} />
                  <SubmitButton
                    label={t("reopen")}
                    pendingLabel={t("pending")}
                    variant="outline"
                  />
                </form>
              ) : null}
              {actions.snooze ? (
                <form action={actions.snooze}>
                  <input type="hidden" name="oneThingId" value={canvas.id} />
                  <SubmitButton
                    label={t("snooze")}
                    pendingLabel={t("pending")}
                    variant="outline"
                  />
                </form>
              ) : null}
              <form action={actions.remove}>
                <input type="hidden" name="oneThingId" value={canvas.id} />
                <SubmitButton
                  label={t("deleteConsequence")}
                  pendingLabel={t("pending")}
                  variant="ghost"
                />
              </form>
            </div>
          )}

          {/* Consequence body — quote-block style under the resolve actions. */}
          {canvas.consequence ? (
            <div className="rounded-r-md border-l-2 border-primary/40 bg-muted/30 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {canvas.consequence}
            </div>
          ) : null}

          {/* Comments — secondary surface, kept inline; org-only. */}
          {scope === "org" && actions.addComment ? (
            <details className="border-t pt-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                {t("commentsLabel")}
              </summary>
              <form
                action={actions.addComment}
                className="mt-3 flex flex-col gap-2"
              >
                <input type="hidden" name="oneThingId" value={canvas.id} />
                <Textarea
                  name="body"
                  rows={2}
                  placeholder={t("commentPlaceholder")}
                  required
                />
                <div>
                  <SubmitButton
                    label={t("addComment")}
                    pendingLabel={t("pending")}
                    variant="outline"
                  />
                </div>
              </form>
            </details>
          ) : null}
        </article>
      ) : (
        <article className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-card p-8 text-center sm:items-center">
          <p className="text-base font-medium text-foreground">
            {t("queueClearTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("queueClearDescription")}
          </p>
        </article>
      )}

      {/* Admin row — purge resolved (org only, behind canAdmin). */}
      {scope === "org" && canAdmin && actions.purge ? (
        <div className="flex flex-wrap gap-2">
          <form action={actions.purge}>
            <SubmitButton
              label={t("purgeResolved")}
              pendingLabel={t("pending")}
              variant="outline"
            />
          </form>
        </div>
      ) : null}
    </section>
  )
}
