import { describe, expect, it } from "vitest"

import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from "#features/knowledge/constants"
import {
  ingestChunkSchema,
  searchSimilarSchema,
} from "#features/knowledge/schemas/chunk.schema"

describe("ingestChunkSchema", () => {
  it("accepts valid title and body", () => {
    const r = ingestChunkSchema.safeParse({
      title: "Policy",
      body: "Returns accepted within 30 days.",
    })
    expect(r.success).toBe(true)
  })

  it("rejects empty title", () => {
    const r = ingestChunkSchema.safeParse({ title: "   ", body: "x" })
    expect(r.success).toBe(false)
  })
})

describe("searchSimilarSchema", () => {
  it("accepts non-empty query", () => {
    const r = searchSimilarSchema.safeParse({ query: "refund policy" })
    expect(r.success).toBe(true)
  })

  it("rejects blank query", () => {
    const r = searchSimilarSchema.safeParse({ query: "  " })
    expect(r.success).toBe(false)
  })
})

describe("KNOWLEDGE_EMBEDDING_DIMENSIONS", () => {
  it("matches Drizzle vector column width", () => {
    expect(KNOWLEDGE_EMBEDDING_DIMENSIONS).toBe(1536)
  })
})
