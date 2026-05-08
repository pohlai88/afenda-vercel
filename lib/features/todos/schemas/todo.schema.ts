import { z } from "zod"

import { TODO_PRIORITIES, TODO_STATES } from "../constants"

export const todoTitleSchema = z.string().trim().min(1).max(500)

/**
 * Operational atom — Zod parsers for the four JSONB spokes on `erp_todo`. All
 * four are optional and additive; reject only when the payload is present and
 * malformed (the queries treat unparsable rows as `null` so legacy data keeps
 * working — see `lib/features/todos/data/todos.queries.server.ts`).
 */

export const todoLinkageEntityRefSchema = z.object({
  module: z.string().trim().min(1).max(8),
  id: z.string().trim().min(1).max(200),
  label: z.string().trim().max(200).optional(),
  meta: z.string().trim().max(200).optional(),
})

export const todoLinkageSchema = z.object({
  runId: z.string().trim().min(1).max(200).optional(),
  entities: z.array(todoLinkageEntityRefSchema).max(20).optional(),
  owningModule: z.string().trim().min(1).max(8).optional(),
})

export const todoCounterpartySchema = z.object({
  direction: z.enum(["you-owe", "owes-you", "system", "shared"]),
  userId: z.string().trim().min(1).max(200).optional(),
  displayName: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().max(200).optional(),
  external: z.boolean().optional(),
})

export const todoProvenanceSchema = z.object({
  kind: z.enum(["person", "lynx", "cron", "approval", "import", "system"]),
  source: z.string().trim().max(200).optional(),
  confidence: z.number().min(0).max(1).optional(),
  note: z.string().trim().max(500).optional(),
})

export const todoImpactSchema = z.object({
  unblocks: z.number().int().min(0).max(10_000).optional(),
  slipCostUsd: z.number().finite().optional(),
  slaHorizonMs: z.number().int().optional(),
  blocksGate: z.string().trim().max(200).optional(),
})

/** Coerce-or-null helper used by the queries to never reject hydrated rows. */
export function safeParseTodoSpoke<T>(
  schema: z.ZodType<T>,
  raw: unknown
): T | null {
  if (raw == null) return null
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export const createOrgTodoSchema = z.object({
  title: todoTitleSchema,
  description: z.string().trim().max(20_000).optional().default(""),
  priority: z.enum(TODO_PRIORITIES).optional().default("normal"),
  dueAt: z.string().optional().nullable(),
  assigneeUserId: z.string().trim().min(1).optional().nullable(),
  listId: z.string().uuid().optional(),
  /** Optional atom seed — accepts pre-formed JSON so RSC can pre-link. */
  linkage: todoLinkageSchema.optional().nullable(),
  counterparty: todoCounterpartySchema.optional().nullable(),
  provenance: todoProvenanceSchema.optional().nullable(),
  impact: todoImpactSchema.optional().nullable(),
})

export const todoIdSchema = z.object({
  todoId: z.string().uuid(),
})

export const todoCommentSchema = z.object({
  todoId: z.string().uuid(),
  body: z.string().trim().min(1).max(8000),
})

export const todoAttachmentSchema = z.object({
  todoId: z.string().uuid(),
  url: z.string().url().max(2048),
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  mimeType: z.string().min(1).max(128),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(50 * 1024 * 1024),
})

export function parseOptionalDueAt(
  raw: string | null | undefined
): Date | null {
  if (!raw || raw.trim() === "") return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export const todoStateSchema = z.enum(TODO_STATES)
