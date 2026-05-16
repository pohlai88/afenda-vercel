import "server-only"

import { embedMany } from "ai"

import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from "#features/knowledge/constants"
import {
  DEFAULT_EMBEDDING_MODEL,
  hasAiGatewayAuth,
  resolveAiGateway,
} from "#lib/ai/gateway.server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"

import { getOrgProviderApiKey } from "./credential.queries.server"

export type EmbeddedBatch = {
  embeddingModelVersion: string
  vectors: number[][]
}

export async function embedKnowledgeBatch(
  organizationId: string,
  chunks: string[],
  options?: { enforceZdr?: boolean }
): Promise<EmbeddedBatch> {
  return runWithNodeOtelSpan(
    "knowledge.embed.batch",
    {
      "erp.module": "knowledge",
      "erp.organization.id": organizationId,
      "knowledge.chunk.count": chunks.length,
      "knowledge.embed.zero_data_retention": Boolean(options?.enforceZdr),
    },
    async () => {
      if (!hasAiGatewayAuth()) {
        throw new Error(
          "AI Gateway credentials missing (AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN)"
        )
      }

      const model =
        process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL
      const openAiByok = await getOrgProviderApiKey(organizationId, "openai")

      const { embeddings } = await embedMany({
        model: resolveAiGateway().textEmbeddingModel(model),
        values: chunks,
        maxRetries: 2,
        providerOptions: {
          gateway: {
            order: ["openai", "anthropic"],
            ...(openAiByok
              ? { byok: { openai: [{ apiKey: openAiByok }] } }
              : {}),
            ...(options?.enforceZdr ? { zeroDataRetention: true } : {}),
          },
          openai: { dimensions: KNOWLEDGE_EMBEDDING_DIMENSIONS },
        } as const,
      })

      for (const vector of embeddings) {
        if (vector.length !== KNOWLEDGE_EMBEDDING_DIMENSIONS) {
          throw new Error(
            `Embedding length ${vector.length} does not match schema (${KNOWLEDGE_EMBEDDING_DIMENSIONS})`
          )
        }
      }

      return {
        embeddingModelVersion: model,
        vectors: embeddings,
      }
    }
  )
}
