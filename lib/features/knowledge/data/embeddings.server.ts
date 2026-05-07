import "server-only"

import { openai } from "@ai-sdk/openai"
import { embed } from "ai"

import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from "#features/knowledge/constants"

/**
 * Server-only text embeddings for knowledge chunks. Requires `OPENAI_API_KEY`
 * (see `.env.config.example`). Uses `text-embedding-3-small` at 1536 dimensions
 * to match the `knowledge_chunk.embedding` column.
 */
export async function embedKnowledgeText(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is not set")
  }

  const { embedding } = await embed({
    model: openai.embedding(
      process.env.EMBEDDING_MODEL?.trim() || "text-embedding-3-small"
    ),
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
