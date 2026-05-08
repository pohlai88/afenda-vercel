import { describe, expect, it } from "vitest"

import { summarizeEvalScores } from "#features/knowledge/data/eval-metrics.shared"

describe("summarizeEvalScores", () => {
  it("returns zeros for empty input", () => {
    expect(summarizeEvalScores([], 8)).toEqual({
      totalCases: 0,
      recallAtK: 0,
      meanReciprocalRank: 0,
      evidenceOverlap: 0,
    })
  })

  it("computes recall and MRR across mixed hits", () => {
    const summary = summarizeEvalScores(
      [
        {
          expectedEvidenceIds: ["a"],
          retrievedEvidenceIds: ["z", "a"],
        },
        {
          expectedEvidenceIds: ["b"],
          retrievedEvidenceIds: ["x", "y", "z"],
        },
      ],
      3
    )

    expect(summary.totalCases).toBe(2)
    expect(summary.recallAtK).toBe(0.5)
    expect(summary.meanReciprocalRank).toBeCloseTo(0.25, 6)
    expect(summary.evidenceOverlap).toBeCloseTo(0.5, 6)
  })
})
