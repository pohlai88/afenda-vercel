import "server-only"

import { gateway } from "@ai-sdk/gateway"
import { embedMany } from "ai"

import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from "#features/knowledge/constants"
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
      const hasGateway = Boolean(process.env.AI_GATEWAY_API_KEY?.trim())
      const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim())
      if (!hasGateway && !hasOpenAi) {
        throw new Error("AI_GATEWAY_API_KEY or OPENAI_API_KEY must be set")
      }

      const model =
        process.env.EMBEDDING_MODEL?.trim() || "openai/text-embedding-3-small"
      const openAiByok = await getOrgProviderApiKey(organizationId, "openai")

      const { embeddings } = await embedMany({
        model: gateway.textEmbeddingModel(model),
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
