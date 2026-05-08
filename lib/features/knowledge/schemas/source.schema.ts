import { z } from "zod"

import { KNOWLEDGE_SOURCE_KINDS } from "#features/knowledge/constants"

export const knowledgeSourceKindSchema = z.enum(KNOWLEDGE_SOURCE_KINDS)

export const knowledgeSourceConfigSchema = z
  .record(z.string(), z.unknown())
  .default({})

export const createKnowledgeSourceInputSchema = z.object({
  kind: knowledgeSourceKindSchema,
  name: z.string().trim().min(2).max(120),
  configJson: z.string().trim().default("{}"),
  enabled: z.boolean().optional().default(true),
})

export const updateKnowledgeSourceInputSchema = z.object({
  sourceId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  configJson: z.string().trim().default("{}"),
  enabled: z.boolean().optional().default(true),
})

export const deleteKnowledgeSourceInputSchema = z.object({
  sourceId: z.string().uuid(),
})

export const runKnowledgeSourceSyncInputSchema = z.object({
  sourceId: z.string().uuid(),
})

export const runKnowledgeEvalSetInputSchema = z.object({
  evalSetId: z.string().uuid(),
  topK: z.number().int().min(1).max(30).optional().default(8),
})

export function parseSourceConfigJson(
  raw: string
): { ok: true; value: Record<string, unknown> } | { ok: false } {
  try {
    const parsed = JSON.parse(raw || "{}")
    const validated = knowledgeSourceConfigSchema.safeParse(parsed)
    if (!validated.success) return { ok: false }
    return { ok: true, value: validated.data }
  } catch {
    return { ok: false }
  }
}
