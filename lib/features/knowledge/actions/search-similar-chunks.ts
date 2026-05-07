"use server"

import { requireOrgSession } from "#lib/tenant"

import { embedKnowledgeText } from "#features/knowledge/data/embeddings.server"
import { findSimilarKnowledgeChunks } from "#features/knowledge/data/knowledge-chunk.queries"
import { searchSimilarSchema } from "#features/knowledge/schemas/chunk.schema"
import type { SearchSimilarFormState } from "#features/knowledge/types"

export async function searchSimilarKnowledgeChunks(
  _prevState: SearchSimilarFormState,
  formData: FormData
): Promise<SearchSimilarFormState> {
  const { organizationId } = await requireOrgSession()

  const parsed = searchSimilarSchema.safeParse({
    query: formData.get("query"),
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        query: fieldErrors.query?.[0],
      },
    }
  }

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedKnowledgeText(parsed.data.query)
  } catch {
    return {
      ok: false,
      errors: {
        form: "Could not embed search query. Check OPENAI_API_KEY and try again.",
      },
    }
  }

  try {
    const rows = await findSimilarKnowledgeChunks(
      organizationId,
      queryEmbedding,
      10
    )
    return { ok: true, rows }
  } catch {
    return {
      ok: false,
      errors: {
        form: "Search failed. Try again.",
      },
    }
  }
}
