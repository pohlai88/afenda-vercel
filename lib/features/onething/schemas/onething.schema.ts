import { z } from "zod"

import { ONETHING_SEVERITIES, ONETHING_STATES } from "../constants"

export const onethingTitleSchema = z.string().trim().min(1).max(500)

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
  title: onethingTitleSchema,
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
