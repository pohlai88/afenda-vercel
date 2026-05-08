import "server-only"

import { asc, cosineDistance, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeChunk } from "#lib/db/schema"

import type { SimilarChunkRow } from "#features/knowledge/types"

export type KnowledgeChunkListRow = {
  id: string
  title: string
  body: string
  createdAt: Date
}

/** Recent chunks for the org dashboard — call only after `requireOrgSession()`. */
export async function listRecentKnowledgeChunks(
  organizationId: string,
  limit: number
): Promise<KnowledgeChunkListRow[]> {
  return db
    .select({
      id: knowledgeChunk.id,
      title: knowledgeChunk.title,
      body: knowledgeChunk.body,
      createdAt: knowledgeChunk.createdAt,
    })
    .from(knowledgeChunk)
    .where(eq(knowledgeChunk.organizationId, organizationId))
    .orderBy(desc(knowledgeChunk.createdAt))
    .limit(limit)
}

/** Tenant-scoped similarity search — call only after `requireOrgSession()`. */
export async function findSimilarKnowledgeChunks(
  organizationId: string,
  queryEmbedding: number[],
  limit: number
): Promise<SimilarChunkRow[]> {
  const dist = cosineDistance(knowledgeChunk.embedding, queryEmbedding)

  const rows = await db
    .select({
      id: knowledgeChunk.id,
      title: knowledgeChunk.title,
      body: knowledgeChunk.body,
      createdAt: knowledgeChunk.createdAt,
      distance: dist,
    })
    .from(knowledgeChunk)
    .where(eq(knowledgeChunk.organizationId, organizationId))
    .orderBy(asc(dist))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
    distance: Number(r.distance),
  }))
}
