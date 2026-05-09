import "server-only"

import { and, eq, isNotNull, or, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"

import type { KnowledgeSourceAdapter } from "./source-adapter.server"

const MAX_ONETHING_DOCS = 500

const onethingSourceConfigSchema = z.object({
  includeResolved: z.boolean().optional().default(false),
})

/**
 * Indexes org-scoped OneThing titles + consequences into the knowledge pipeline.
 * Personal OneThings (`ownerUserId` set) are excluded — they are not org knowledge.
 */
export const onethingSourceAdapter: KnowledgeSourceAdapter<{
  includeResolved?: boolean
}> = {
  id: "onething",
  configSchema: onethingSourceConfigSchema,

  async *listDocuments(ctx, config) {
    const parsed = onethingSourceConfigSchema.safeParse(config)
    if (!parsed.success) {
      throw new Error("Invalid onething source config")
    }
    const includeResolved = parsed.data.includeResolved

    const conditions = [
      eq(oneThing.organizationId, ctx.organizationId),
      isNotNull(oneThing.organizationId),
      or(
        sql`length(trim(${oneThing.title})) > 0`,
        sql`length(trim(${oneThing.consequence})) > 0`
      ),
    ]
    if (!includeResolved) {
      conditions.push(sql`${oneThing.state} NOT IN ('resolved', 'deprecated')`)
    }

    const rows = await db
      .select({
        id: oneThing.id,
        title: oneThing.title,
        consequence: oneThing.consequence,
      })
      .from(oneThing)
      .where(and(...conditions))
      .limit(MAX_ONETHING_DOCS)

    for (const row of rows) {
      const body = [row.title, row.consequence].filter(Boolean).join("\n\n")
      if (!body.trim()) continue
      yield {
        externalId: row.id,
        title: row.title,
        body,
        mimeType: "text/plain",
        metadata: { kind: "onething" as const },
      }
    }
  },
}
