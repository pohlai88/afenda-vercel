"use server"

import { requireErpPermission } from "#features/erp-rbac/server"

import { embedKnowledgeText } from "#features/knowledge/data/embeddings.server"
import { findSimilarKnowledgeChunks } from "#features/knowledge/data/knowledge-chunk.queries"
import { searchSimilarSchema } from "#features/knowledge/schemas/chunk.schema"
import type { SearchSimilarFormState } from "#features/knowledge/types"

export async function searchSimilarKnowledgeChunks(
  _prevState: SearchSimilarFormState,
  formData: FormData
): Promise<SearchSimilarFormState> {
  const gate = await requireErpPermission({
    module: "knowledge",
    object: "chunk",
    function: "search",
  })
  if (!gate.ok) {
    return { ok: false, errors: { form: gate.error } }
  }
  const { organizationId } = gate.session

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
        form: "Could not embed search query. Check AI Gateway credentials and try again.",
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
