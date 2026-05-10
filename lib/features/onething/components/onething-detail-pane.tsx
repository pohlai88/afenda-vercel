"use client"

import { useEffect, useMemo } from "react"

import { useTranslations } from "next-intl"

import {
  useOptionalLynxSummon,
  type LynxGroundingChip,
} from "#components/nexus/nexus-lynx-summon-context"

import { describeTemporalSpine } from "#lib/erp/temporal-spine.shared"

import {
  inferResolveSeverityFromSignals,
  safeParsePredictions,
  type OneThingCounterparty,
  type OneThingRow,
  type Prediction,
  type ResolveSeverity,
} from "#features/onething/client"

import { formatAmbientTime } from "./hooks/ambient-time.shared"
import { useNow } from "./hooks/use-now"
import { OneThingDetailAuditFooter } from "./onething-detail-audit-footer"
import {
  OneThingDetailToolbar,
  type OneThingDetailToolbarActions,
} from "./onething-detail-toolbar"

/**
 * Detail pane — the operational document.
 *
 * Title carries the situation. Byline narrates the counterparty + when. Body
 * is Past · Now · Next prose with inline `<sup>` predictions. Toolbar is
 * five quiet controls. Audit footer reads as a continuity thread.
 *
 * No why-now pill. No provenance line. No labeled stakes block. No linkage
 * chips on the surface. The prose carries the weight; chrome is gone.
 */

function counterpartyLabel(
  cp: OneThingCounterparty | null,
  fallback: string
): string {
  if (!cp) return fallback
  const trimmed = cp.displayName?.trim() || cp.userId?.trim() || ""
  return trimmed || fallback
}

export function OneThingDetailPane({
  canvas,
  whyNow,
  toolbarActions,
}: {
  canvas: OneThingRow
  whyNow: string
  toolbarActions: Omit<
    OneThingDetailToolbarActions,
    "resolveSeverity" | "onResolveStart" | "onResolveCommitted"
  > & {
    onResolveStart?: () => void
    onResolveCommitted?: () => void
  }
}) {
  const t = useTranslations("Dashboard.OneThing")

  const now = useNow()

  const predictions = useMemo<Prediction[]>(
    () => safeParsePredictions(canvas.predictions ?? null),
    [canvas.predictions]
  )

  const resolveSeverity = useMemo<ResolveSeverity>(
    () =>
      inferResolveSeverityFromSignals({
        impactBlocksGate: canvas.impact?.blocksGate,
        slipCostUsd: canvas.impact?.slipCostUsd,
        severity: canvas.severity,
        predictions,
      }),
    [canvas, predictions]
  )

  const temporalSpine = useMemo(
    () =>
      describeTemporalSpine({
        past: canvas.temporalPast,
        now: canvas.temporalNow,
        next: canvas.temporalNext,
      }),
    [canvas]
  )

  // Lynx grounding — register the open atom while the pane is mounted.
  const setGrounding = useOptionalLynxSummon()?.setGrounding
  const groundingSignature = useMemo(
    () =>
      JSON.stringify({
        id: canvas.id,
        title: canvas.title,
        summary: canvas.consequence ?? null,
        entities: (canvas.linkage?.entities ?? []).slice(0, 3),
      }),
    [canvas]
  )
  useEffect(() => {
    if (!setGrounding) return
    const chips: LynxGroundingChip[] = (canvas.linkage?.entities ?? [])
      .slice(0, 3)
      .map((ref) => ({
        module: ref.module,
        label: ref.label ?? ref.id,
        meta: ref.meta,
      }))
    setGrounding({
      source: "onething",
      id: canvas.id,
      title: canvas.title,
      summary: canvas.consequence ?? null,
      chips,
    })
    return () => {
      setGrounding(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature drives setGrounding identity
  }, [setGrounding, groundingSignature])

  const counterpartyText = counterpartyLabel(
    canvas.counterparty,
    t("counterpartyUnknown")
  )

  const updatedAtMs = canvas.updatedAt.getTime()
  const ago =
    now > 0 ? formatAmbientTime(Math.max(0, now - updatedAtMs), t) : ""

  const past = temporalSpine?.past?.trim() ?? ""
  const nowProse =
    temporalSpine?.now?.trim() || canvas.consequence?.trim() || ""
  const next = temporalSpine?.next?.trim() ?? ""

  const audit = canvas.audit7w1h ?? []

  return (
    <article
      className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14"
      aria-label={canvas.title}
    >
      {/* Editorial headline — clamp() so it scales with the pane. */}
      <header className="flex flex-col gap-3">
        <h1
          className="font-semibold tracking-[-0.04em] text-foreground"
          style={{
            fontSize: "clamp(2rem, 4vw, 3.4rem)",
            lineHeight: 1.08,
          }}
        >
          {canvas.title}
        </h1>
        <p className="text-sm text-muted-foreground/80">
          {canvas.counterparty
            ? t("shell.bylineWithCounterparty", {
                counterparty: counterpartyText,
                ago,
              })
            : t("shell.bylineSolo", { ago })}
        </p>
      </header>

      {/* Prose body — Past · Now · Next as paragraphs, no labels. */}
      <section
        className="flex flex-col gap-8 text-base leading-[1.85] text-foreground/85"
        style={{ maxWidth: "64ch" }}
      >
        {past ? <p>{past}</p> : null}
        {nowProse ? (
          <p>
            {nowProse}
            {predictions.length > 0
              ? predictions.map((p, i) => (
                  <sup
                    key={p.id}
                    className={`ml-0.5 text-[0.6em] ${
                      p.severity === "critical"
                        ? "text-destructive"
                        : p.severity === "high"
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                    title={p.claim}
                  >
                    {i + 1}
                  </sup>
                ))
              : null}
          </p>
        ) : null}
        {next ? <p>{next}</p> : null}
      </section>

      {/* Why-now is folded into a quiet caption when the operator opened
          via the ranker, not a chunky pill. */}
      {whyNow ? (
        <p className="text-xs text-muted-foreground italic">{whyNow}</p>
      ) : null}

      {predictions.length > 0 ? (
        <ol className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          {predictions.map((p, i) => (
            <li key={p.id}>
              <span className="mr-1 text-foreground/70">{i + 1}.</span>
              {p.claim}
            </li>
          ))}
        </ol>
      ) : null}

      <OneThingDetailToolbar
        canvas={canvas}
        actions={{
          ...toolbarActions,
          resolveSeverity,
        }}
      />

      <footer className="pt-2">
        {now > 0 ? (
          <OneThingDetailAuditFooter events={audit} nowMs={now} />
        ) : null}
      </footer>
    </article>
  )
}
