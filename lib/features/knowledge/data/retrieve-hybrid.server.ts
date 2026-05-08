import "server-only"

import { asc, cosineDistance, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeChunk } from "#lib/db/schema"

import type { HybridRetrievalRow } from "#features/knowledge/types"

import { rerankKnowledgeRows } from "./retrieve-rerank.server"

type LexicalRow = {
  id: string
  lexical_score: number
}

export async function hybridRetrieveKnowledge(args: {
  organizationId: string
  query: string
  queryEmbedding: number[]
  topK: number
  rerankEnabled: boolean
  gatewayByok?: Record<string, Array<{ apiKey: string }>>
}): Promise<HybridRetrievalRow[]> {
  const candidateLimit = Math.max(args.topK * 3, 24)
  const dist = cosineDistance(knowledgeChunk.embedding, args.queryEmbedding)

  const semanticRows = await db
    .select({
      id: knowledgeChunk.id,
      title: knowledgeChunk.title,
      body: knowledgeChunk.body,
      createdAt: knowledgeChunk.createdAt,
      distance: dist,
    })
    .from(knowledgeChunk)
    .where(eq(knowledgeChunk.organizationId, args.organizationId))
    .orderBy(asc(dist))
    .limit(candidateLimit)

  const lexicalRows = await db.execute<LexicalRow>(
    sql`
      SELECT
        "id",
        ts_rank_cd(
          to_tsvector('english', "title" || ' ' || "body"),
          websearch_to_tsquery('english', ${args.query})
        ) AS lexical_score
      FROM "knowledge_chunk"
      WHERE "organizationId" = ${args.organizationId}
        AND to_tsvector('english', "title" || ' ' || "body")
          @@ websearch_to_tsquery('english', ${args.query})
      ORDER BY lexical_score DESC
      LIMIT ${candidateLimit}
    `
  )

  const lexicalById = new Map<string, { rank: number; score: number }>()
  for (let i = 0; i < lexicalRows.rows.length; i += 1) {
    const row = lexicalRows.rows[i]!
    lexicalById.set(row.id, { rank: i + 1, score: Number(row.lexical_score) })
  }

  const merged = semanticRows.map((row, idx) => {
    const lexical = lexicalById.get(row.id)
    const semanticRank = idx + 1
    const lexicalRank = lexical?.rank ?? candidateLimit + semanticRank
    const fusedRank = 1 / (60 + semanticRank) + 1 / (60 + lexicalRank)
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
      distance: Number(row.distance),
      lexicalScore: lexical?.score ?? 0,
      semanticRank,
      lexicalRank,
      fusedRank,
    } satisfies HybridRetrievalRow
  })

  merged.sort((a, b) => b.fusedRank - a.fusedRank)
  const fused = merged.slice(0, Math.max(args.topK, 8))
  if (!args.rerankEnabled) {
    return fused.slice(0, args.topK)
  }
  return rerankKnowledgeRows({
    query: args.query,
    rows: fused,
    topK: args.topK,
    gatewayByok: args.gatewayByok,
  })
}
