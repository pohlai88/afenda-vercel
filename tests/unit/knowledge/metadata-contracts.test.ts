import { describe, expect, it } from "vitest"

import {
  knowledgeEvalRunMetadataSchema,
  retrievalModeSchema,
} from "#features/knowledge/data/metadata-contracts.shared"

describe("knowledge metadata contracts", () => {
  it("accepts valid eval-run metadata", () => {
    const parsed = knowledgeEvalRunMetadataSchema.safeParse({
      retrievalMode: "hybrid",
      topK: 8,
      cases: [
        {
          caseId: "1",
          question: "q",
          expectedEvidenceIds: ["a"],
          retrievedEvidenceIds: ["a"],
          hit: true,
          reciprocalRank: 1,
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects malformed retrieval mode", () => {
    expect(retrievalModeSchema.safeParse("not-real").success).toBe(false)
  })
})
