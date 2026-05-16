import "server-only"

import { embed } from "ai"

import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from "#features/knowledge/constants"
import {
  DEFAULT_EMBEDDING_MODEL,
  hasAiGatewayAuth,
  resolveEmbeddingModel,
} from "#lib/ai/gateway.server"

/**
 * Server-only text embeddings for knowledge chunks. Requires AI Gateway
 * credentials (`AI_GATEWAY_API_KEY` locally or `VERCEL_OIDC_TOKEN` on Vercel).
 * Uses `openai/text-embedding-3-small` at 1536 dimensions to match
 * `knowledge_chunk.embedding`.
 */
export async function embedKnowledgeText(text: string): Promise<number[]> {
  if (!hasAiGatewayAuth()) {
    throw new Error(
      "AI Gateway credentials missing (AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN)"
    )
  }

  const modelId = process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL

  const { embedding } = await embed({
    model: resolveEmbeddingModel(modelId),
    value: text,
    providerOptions: {
      openai: {
        dimensions: KNOWLEDGE_EMBEDDING_DIMENSIONS,
      },
    },
  })

  if (embedding.length !== KNOWLEDGE_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding length ${embedding.length} does not match schema (${KNOWLEDGE_EMBEDDING_DIMENSIONS})`
    )
  }

  return embedding
}
