/**
 * @packageDocumentation
 * Past · Now · Next — Afenda’s temporal operating spine (shared, Edge-safe).
 *
 * Cross-cutting systems (Lynx, ranker, command palette, dashboards, AI
 * summarisation) consume {@link TemporalObject} rather than module-specific row
 * types. Implement {@link TemporalObject} on operational records or adapt rows
 * with {@link asTemporal} / {@link asTemporalFromColumns}.
 */

import { z } from "zod"

/** Provenance / cause / evidence — answers “How did we get here?” */
export type TemporalPast = {
  originNote?: string
  triggeredBy?: string
  sourceRecordRef?: { module: string; id: string; label?: string }
  policyRef?: string
}

/** Current consequence — answers “What must I resolve now?” */
export type TemporalNow = {
  /** One-sentence consequence statement, plain English, actionable. */
  consequence: string
  blocker?: string
  /** Operator-prepared next-safe-action (Operating Brief surface). */
  nextSafeAction?: string
}

/** Downstream / release — answers “Who or what is affected next?” */
export type TemporalNext = {
  nextActorId?: string | null
  nextActorDisplayName?: string | null
  unlocksWorkflowId?: string | null
  /** What breaks if ignored — complement to gate fields on consumer rows. */
  failureConsequence?: string
}

/** Internal ontology alias: Present is the same operational facet as UI Now. */
export type TemporalPresent = TemporalNow

/** Internal ontology alias: Future is the same operational facet as UI Next. */
export type TemporalFuture = TemporalNext

export const TEMPORAL_SPINE_UI_LAYERS = ["past", "now", "next"] as const
export type TemporalSpineUiLayer = (typeof TEMPORAL_SPINE_UI_LAYERS)[number]

export const TEMPORAL_SPINE_INTERNAL_LAYERS = [
  "past",
  "present",
  "future",
] as const
export type TemporalSpineInternalLayer =
  (typeof TEMPORAL_SPINE_INTERNAL_LAYERS)[number]

export const TEMPORAL_SPINE_LAYER_METADATA = {
  past: {
    uiLabel: "Past",
    internalLabel: "Past",
    question: "How did we get here?",
    crudSapFocus: ["search", "audit"],
  },
  now: {
    uiLabel: "Now",
    internalLabel: "Present",
    question: "What must I resolve now?",
    crudSapFocus: ["resolve", "update"],
  },
  next: {
    uiLabel: "Next",
    internalLabel: "Future",
    question: "Who or what is affected next?",
    crudSapFocus: ["predict", "create"],
  },
} as const

/** Bundled Past · Now · Next facets on an operational row. */
export type TemporalSpine = {
  past?: TemporalPast | null
  now?: TemporalNow | null
  next?: TemporalNext | null
}

const sourceRecordRefSchema = z.object({
  module: z.string().trim().min(1).max(64),
  id: z.string().trim().min(1).max(256),
  label: z.string().trim().max(512).optional(),
})

export const temporalPastSchema = z
  .object({
    originNote: z.string().trim().max(8000).optional(),
    triggeredBy: z.string().trim().max(512).optional(),
    sourceRecordRef: sourceRecordRefSchema.optional(),
    policyRef: z.string().trim().max(512).optional(),
  })
  .strict()

export const temporalNowSchema = z
  .object({
    consequence: z.string().trim().min(1).max(20_000),
    blocker: z.string().trim().max(8000).optional(),
    nextSafeAction: z.string().trim().max(8000).optional(),
  })
  .strict()

export const temporalNextSchema = z
  .object({
    nextActorId: z.string().trim().min(1).max(256).nullable().optional(),
    nextActorDisplayName: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .nullable()
      .optional(),
    unlocksWorkflowId: z.string().trim().min(1).max(256).nullable().optional(),
    failureConsequence: z.string().trim().max(8000).optional(),
  })
  .strict()

export const temporalSpineSchema = z
  .object({
    past: temporalPastSchema.nullish(),
    now: temporalNowSchema.nullish(),
    next: temporalNextSchema.nullish(),
  })
  .strict()

/**
 * Universal operational interface — implement on any operational object so
 * cross-cutting code reads temporal facets without knowing the originating module.
 */
export interface TemporalObject {
  getPast(): TemporalPast | null
  getNow(): TemporalNow | null
  getNext(): TemporalNext | null
}

/** Coerce-or-null parser for hydrating JSONB columns without rejecting legacy rows. */
export function safeParseTemporal<T>(
  schema: z.ZodType<T>,
  raw: unknown
): T | null {
  if (raw == null) return null
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/** Adapter — wraps a row carrying `temporalSpine` (already parsed or trusted). */
export function asTemporal<T extends { temporalSpine?: TemporalSpine | null }>(
  obj: T
): TemporalObject {
  return {
    getPast: () => obj.temporalSpine?.past ?? null,
    getNow: () => obj.temporalSpine?.now ?? null,
    getNext: () => obj.temporalSpine?.next ?? null,
  }
}

/**
 * Row fragment carrying Past · Now · Next JSONB (or equivalent) before hydration.
 *
 * Canonical column names are Drizzle-style camelCase (`temporalPast`, `temporalNow`,
 * `temporalNext`). The snake_case and `*_context` variants are kept only for
 * backward compatibility with early schema drafts and must not appear on new tables.
 *
 * @deprecated `temporal_past` / `temporal_now` / `temporal_next` (snake_case) —
 * migrate callers to camelCase `temporalPast` / `temporalNow` / `temporalNext`.
 * @deprecated `past_context` / `now_context` / `next_context` (legacy column aliases) —
 * migrate callers to camelCase `temporalPast` / `temporalNow` / `temporalNext`.
 */
export type TemporalColumnSource = {
  temporalPast?: unknown
  temporalNow?: unknown
  temporalNext?: unknown
  /** @deprecated Use `temporalPast` instead. */
  temporal_past?: unknown
  /** @deprecated Use `temporalNow` instead. */
  temporal_now?: unknown
  /** @deprecated Use `temporalNext` instead. */
  temporal_next?: unknown
  /** @deprecated Use `temporalPast` instead. */
  past_context?: unknown
  /** @deprecated Use `temporalNow` instead. */
  now_context?: unknown
  /** @deprecated Use `temporalNext` instead. */
  next_context?: unknown
}

/** Adapter — parses loose JSONB columns into {@link TemporalObject}. */
export function asTemporalFromColumns(
  columns: TemporalColumnSource
): TemporalObject {
  const pastRaw =
    columns.temporalPast ?? columns.temporal_past ?? columns.past_context
  const nowRaw =
    columns.temporalNow ?? columns.temporal_now ?? columns.now_context
  const nextRaw =
    columns.temporalNext ?? columns.temporal_next ?? columns.next_context

  const past = safeParseTemporal(temporalPastSchema, pastRaw)
  const now = safeParseTemporal(temporalNowSchema, nowRaw)
  const next = safeParseTemporal(temporalNextSchema, nextRaw)
  return {
    getPast: () => past,
    getNow: () => now,
    getNext: () => next,
  }
}

function joinSentences(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join(" ")
}

function describePast(past: TemporalPast): string {
  const bits: string[] = []
  if (past.originNote) bits.push(past.originNote.trim())
  if (past.triggeredBy) bits.push(`Triggered by ${past.triggeredBy.trim()}.`)
  if (past.sourceRecordRef) {
    const ref = past.sourceRecordRef
    const label = ref.label?.trim() ?? ref.id
    bits.push(`Source: ${ref.module} ${label}.`)
  }
  if (past.policyRef) bits.push(`Policy: ${past.policyRef.trim()}.`)
  return joinSentences(bits)
}

function describeNow(now: TemporalNow): string {
  const bits: string[] = [now.consequence.trim()]
  if (now.blocker) bits.push(`Blocked by ${now.blocker.trim()}.`)
  if (now.nextSafeAction)
    bits.push(`Next safe action: ${now.nextSafeAction.trim()}.`)
  return joinSentences(bits)
}

function describeNext(next: TemporalNext): string {
  const bits: string[] = []
  if (next.nextActorDisplayName?.trim())
    bits.push(`Next owner: ${next.nextActorDisplayName.trim()}.`)
  else if (next.nextActorId?.trim())
    bits.push(`Next owner id: ${next.nextActorId.trim()}.`)
  if (next.unlocksWorkflowId?.trim())
    bits.push(`Unlocks workflow ${next.unlocksWorkflowId.trim()}.`)
  if (next.failureConsequence?.trim())
    bits.push(`If ignored: ${next.failureConsequence.trim()}.`)
  return joinSentences(bits)
}

/**
 * Renders the three UI questions in canonical order. Empty strings mean “no data
 * for this facet” — callers may omit empty sections.
 */
export function describeTemporalSpine(spine: TemporalSpine): {
  past: string
  now: string
  next: string
} {
  return {
    past: spine.past ? describePast(spine.past) : "",
    now: spine.now ? describeNow(spine.now) : "",
    next: spine.next ? describeNext(spine.next) : "",
  }
}
