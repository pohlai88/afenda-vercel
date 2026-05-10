import { z } from "zod"

import { ONETHING_SEVERITIES } from "#features/onething"

/** Lenient capture — no situation-shaped refine (ADR-0002). */
export const ithinkTitleSchema = z.string().trim().min(1).max(500)

export const createIThinkSchema = z.object({
  title: ithinkTitleSchema,
  consequence: z.string().trim().max(20_000).optional().default(""),
  severity: z.enum(ONETHING_SEVERITIES).optional().default("medium"),
  dueAt: z.string().optional().nullable(),
  assigneeUserId: z.string().trim().min(1).optional().nullable(),
  listId: z.string().uuid().optional(),
})

export const updateIThinkSchema = z.object({
  oneThingId: z.string().uuid(),
  title: ithinkTitleSchema.optional(),
  consequence: z.string().trim().max(10_000).optional(),
  severity: z.enum(ONETHING_SEVERITIES).optional(),
  dueAt: z.string().optional().nullable(),
})

export const deprecateIThinkSchema = z.object({
  oneThingId: z.string().uuid(),
  reason: z.string().trim().min(1).max(8000),
})
