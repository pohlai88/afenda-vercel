import { z } from "zod"

import { ONETHING_SEVERITIES, ONETHING_STATES } from "../constants"

/**
 * Title-as-situation contract.
 *
 * The list pane renders a single line per OneThing — the title carries the
 * full operational situation. Without this contract the row anatomy degrades
 * back to "I can't tell what this row means without clicking it" and the
 * preview line / severity badge / assignee chip all return.
 *
 * Operational situations read like complete utterances:
 *   - "Vendor payment blocked for three organizations"
 *   - "South-facing succulents need rotation by month-end"
 *
 * Non-situations are rejected with `OneThingTitleNotSituation`:
 *   - trailing em-dash + technical event ("Vendor payment — RG-FIN-014 failed")
 *   - bare module-noun openers ("Contact:", "PO:", "RUN:")
 *   - pure noun phrases ("Office plant rotation", "Q1 vendor onboarding")
 *   - internal jargon tokens (raw audit verbs)
 *
 * The Lynx ranker still surfaces non-situation titles with a quieter
 * `titleQuality: "event" | "noun"` advisory hint — this refine only blocks
 * the most obvious shapes so operators are nudged, never trapped.
 */

const TECHNICAL_EVENT_TAIL_PATTERN =
  /\s[—–-]\s\S+\s+(failed|pending|rejected|errored|blocked|aborted|dispatched|commissioned|scheduled|posted|reversed|approved|created|updated|deleted)\b/i

const MODULE_NOUN_PREFIX_PATTERN =
  /^(po|so|ct|run|cron|onething|task|ticket|lynx|knowledge|kn|admin|iam|org|sys|api|sql|cli|sdk|lp|pp)\s*[:#]/i

const SINGLE_TOKEN_PATTERN = /^\S+$/

export type OneThingTitleQualityIssue =
  | "technical_event_tail"
  | "module_noun_prefix"
  | "single_token"

/**
 * Conservative title-quality classifier — only catches the three unambiguous
 * structural shapes that would degrade the single-line list-pane row. Anything
 * else (including "noun-phrase-y" rows) is left to the Lynx advisory hint.
 *
 * Returns `null` for acceptable titles, an issue code otherwise.
 */
export function classifyOneThingTitleIssue(
  rawTitle: string
): OneThingTitleQualityIssue | null {
  const value = rawTitle.trim()
  if (value.length === 0) return null

  if (MODULE_NOUN_PREFIX_PATTERN.test(value)) return "module_noun_prefix"
  if (TECHNICAL_EVENT_TAIL_PATTERN.test(value)) return "technical_event_tail"
  if (SINGLE_TOKEN_PATTERN.test(value)) return "single_token"
  return null
}

export const ONETHING_TITLE_NOT_SITUATION_CODE = "OneThingTitleNotSituation"

/**
 * Lenient title schema — accepts any non-empty trimmed string up to 500 chars.
 * Kept permissive so legacy data, imported rows, and update paths never
 * choke on hydration. New-capture paths layer `assertOneThingTitleIsSituation`
 * on top of this base shape via `superRefine`.
 */
export const onethingTitleSchema = z.string().trim().min(1).max(500)

/**
 * Strict situation refine — applied only to the create path. Rejects the
 * three structural shapes that would degrade the single-line list-pane row
 * back into "I can't tell what this row means without clicking it".
 *
 * Lynx still surfaces non-situation titles with a soft `titleQuality` advisory
 * for legacy rows (which were captured before this contract existed). The
 * refine itself only prevents new technical-event / module-noun / pure-noun
 * captures from entering the system.
 */
export function assertOneThingTitleIsSituation(
  value: string,
  ctx: z.RefinementCtx
): void {
  const issue = classifyOneThingTitleIssue(value)
  if (!issue) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    params: { code: ONETHING_TITLE_NOT_SITUATION_CODE, issue },
    message:
      issue === "technical_event_tail"
        ? "Title reads as a technical event. Capture the situation it creates (e.g. 'Vendor payment blocked for three organizations')."
        : issue === "module_noun_prefix"
          ? "Title leads with an internal module tag. Lead with the operational situation instead."
          : "Title is a single token. Capture the full situation, not just a label.",
  })
}

/** Strict situation-shaped title — required on new captures. */
export const onethingSituationTitleSchema = onethingTitleSchema.superRefine(
  assertOneThingTitleIsSituation
)

/**
 * Operational atom — Zod parsers for the four JSONB spokes on `erp_onething`. All
 * four are optional and additive; reject only when the payload is present and
 * malformed (the queries treat unparsable rows as `null` so legacy data keeps
 * working — see `lib/features/onething/data/onething.queries.server.ts`).
 */

export const onethingLinkageEntityRefSchema = z.object({
  module: z.string().trim().min(1).max(8),
  id: z.string().trim().min(1).max(200),
  label: z.string().trim().max(200).optional(),
  meta: z.string().trim().max(200).optional(),
})

export const onethingLinkageSchema = z.object({
  runId: z.string().trim().min(1).max(200).optional(),
  entities: z.array(onethingLinkageEntityRefSchema).max(20).optional(),
  owningModule: z.string().trim().min(1).max(8).optional(),
})

export const onethingCounterpartySchema = z.object({
  direction: z.enum(["you-owe", "owes-you", "system", "shared"]),
  userId: z.string().trim().min(1).max(200).optional(),
  displayName: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().max(200).optional(),
  external: z.boolean().optional(),
})

export const onethingProvenanceSchema = z.object({
  kind: z.enum(["person", "lynx", "cron", "approval", "import", "system"]),
  source: z.string().trim().max(200).optional(),
  confidence: z.number().min(0).max(1).optional(),
  note: z.string().trim().max(500).optional(),
})

export const onethingImpactSchema = z.object({
  unblocks: z.number().int().min(0).max(10_000).optional(),
  slipCostUsd: z.number().finite().optional(),
  slaHorizonMs: z.number().int().optional(),
  blocksGate: z.string().trim().max(200).optional(),
})

/** Coerce-or-null helper used by the queries to never reject hydrated rows. */
export function safeParseOneThingSpoke<T>(
  schema: z.ZodType<T>,
  raw: unknown
): T | null {
  if (raw == null) return null
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export const createOrgOneThingSchema = z.object({
  title: onethingSituationTitleSchema,
  consequence: z.string().trim().max(20_000).optional().default(""),
  severity: z.enum(ONETHING_SEVERITIES).optional().default("medium"),
  dueAt: z.string().optional().nullable(),
  assigneeUserId: z.string().trim().min(1).optional().nullable(),
  listId: z.string().uuid().optional(),
  /** Optional atom seed — accepts pre-formed JSON so RSC can pre-link. */
  linkage: onethingLinkageSchema.optional().nullable(),
  counterparty: onethingCounterpartySchema.optional().nullable(),
  provenance: onethingProvenanceSchema.optional().nullable(),
  impact: onethingImpactSchema.optional().nullable(),
})

export const oneThingIdSchema = z.object({
  oneThingId: z.string().uuid(),
})

export const oneThingCommentSchema = z.object({
  oneThingId: z.string().uuid(),
  body: z.string().trim().min(1).max(8000),
})

export const oneThingAttachmentSchema = z.object({
  oneThingId: z.string().uuid(),
  url: z.string().url().max(2048),
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  mimeType: z.string().min(1).max(128),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(50 * 1024 * 1024),
})

/**
 * Reads a JSON-encoded spoke value from FormData. RSC-seeded values arrive as
 * compact JSON strings; absent or unparsable values return `undefined` so the
 * caller's Zod schema skips them. Malformed parsed shapes are still rejected
 * by the schema ("reject only when present and malformed").
 */
export function readFormDataJsonField(
  formData: FormData,
  field: string
): unknown {
  const raw = formData.get(field)
  if (typeof raw !== "string" || raw.trim() === "") return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

export function parseOptionalDueAt(
  raw: string | null | undefined
): Date | null {
  if (!raw || raw.trim() === "") return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export const onethingStateSchema = z.enum(ONETHING_STATES)
