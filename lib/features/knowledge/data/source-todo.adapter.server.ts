import "server-only"

import { and, eq, isNotNull, or, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "#lib/db"
import { erpTodo } from "#lib/db/schema"

import type { KnowledgeSourceAdapter } from "./source-adapter.server"

const MAX_TODO_DOCS = 500

const todoSourceConfigSchema = z.object({
  includeCompleted: z.boolean().optional().default(false),
})

/**
 * Indexes org-scoped task titles + descriptions into the knowledge pipeline.
 * Personal tasks (`ownerUserId` set) are excluded — they are not org knowledge.
 */
export const todoSourceAdapter: KnowledgeSourceAdapter<{
  includeCompleted?: boolean
}> = {
  id: "todo",
  configSchema: todoSourceConfigSchema,

  async *listDocuments(ctx, config) {
    const parsed = todoSourceConfigSchema.safeParse(config)
    if (!parsed.success) {
      throw new Error("Invalid todo source config")
    }
    const includeCompleted = parsed.data.includeCompleted

    const conditions = [
      eq(erpTodo.organizationId, ctx.organizationId),
      isNotNull(erpTodo.organizationId),
      or(
        sql`length(trim(${erpTodo.title})) > 0`,
        sql`length(trim(${erpTodo.description})) > 0`
      ),
    ]
    if (!includeCompleted) {
      conditions.push(sql`${erpTodo.state} NOT IN ('completed', 'cancelled')`)
    }

    const rows = await db
      .select({
        id: erpTodo.id,
        title: erpTodo.title,
        description: erpTodo.description,
      })
      .from(erpTodo)
      .where(and(...conditions))
      .limit(MAX_TODO_DOCS)

    for (const row of rows) {
      const body = [row.title, row.description].filter(Boolean).join("\n\n")
      if (!body.trim()) continue
      yield {
        externalId: row.id,
        title: row.title,
        body,
        mimeType: "text/plain",
        metadata: { kind: "todo" as const },
      }
    }
  },
}
