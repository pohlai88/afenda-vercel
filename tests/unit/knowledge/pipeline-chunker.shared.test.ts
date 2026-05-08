import { describe, expect, it } from "vitest"

import { chunkKnowledgeDocument } from "#features/knowledge/data/pipeline-chunker.shared"

describe("chunkKnowledgeDocument", () => {
  it("returns one chunk for empty-ish body", () => {
    const out = chunkKnowledgeDocument({ title: "T", body: "   " })
    expect(out).toHaveLength(1)
    expect(out[0]?.index).toBe(0)
  })

  it("splits deterministically with overlap", () => {
    const body = Array.from({ length: 80 }, (_, i) => `w${i + 1}`).join(" ")
    const out = chunkKnowledgeDocument({
      title: "Doc",
      body,
      targetTokens: 12,
      overlapTokens: 4,
    })
    expect(out.length).toBeGreaterThan(1)
    expect(out[0]?.index).toBe(0)
    expect(out[1]?.index).toBe(1)
    expect(out[0]?.body).not.toBe(out[1]?.body)
  })
})
