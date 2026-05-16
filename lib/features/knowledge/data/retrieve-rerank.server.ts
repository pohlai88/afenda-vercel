import "server-only"

import { rerank } from "ai"

import type { HybridRetrievalRow } from "#features/knowledge/types"
import { hasAiGatewayAuth, resolveRerankingModel } from "#lib/ai/gateway.server"

export async function rerankKnowledgeRows(args: {
  query: string
  rows: HybridRetrievalRow[]
  topK: number
  gatewayByok?: Record<string, Array<{ apiKey: string }>>
}): Promise<HybridRetrievalRow[]> {
  const modelId = process.env.RERANK_MODEL?.trim()
  if (!modelId || args.rows.length === 0) {
    return args.rows.slice(0, args.topK)
  }

  if (!hasAiGatewayAuth()) {
    return args.rows.slice(0, args.topK)
  }

  const result = await rerank({
    model: resolveRerankingModel(modelId),
    query: args.query,
    documents: args.rows.map((row) => row.body),
    topN: Math.min(args.topK, args.rows.length),
    providerOptions: {
      gateway: {
        sort: "cost",
        ...(args.gatewayByok ? { byok: args.gatewayByok } : {}),
      },
    } as const,
  })

  const out: HybridRetrievalRow[] = []
  for (const ranked of result.ranking) {
    const row = args.rows[ranked.originalIndex]
    if (row) out.push(row)
  }
  return out
}
