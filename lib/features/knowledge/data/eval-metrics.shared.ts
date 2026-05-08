import type { EvalRunSummary } from "#features/knowledge/types"

export type EvalCaseScoreInput = {
  expectedEvidenceIds: string[]
  retrievedEvidenceIds: string[]
}

function reciprocalRank(
  expectedEvidenceIds: readonly string[],
  retrievedEvidenceIds: readonly string[]
): number {
  for (let i = 0; i < retrievedEvidenceIds.length; i += 1) {
    if (expectedEvidenceIds.includes(retrievedEvidenceIds[i]!)) {
      return 1 / (i + 1)
    }
  }
  return 0
}

export function summarizeEvalScores(
  cases: EvalCaseScoreInput[],
  topK: number
): EvalRunSummary {
  if (cases.length === 0) {
    return {
      totalCases: 0,
      recallAtK: 0,
      meanReciprocalRank: 0,
      evidenceOverlap: 0,
    }
  }

  let recallHits = 0
  let mrrTotal = 0
  let overlapTotal = 0

  for (const score of cases) {
    const top = score.retrievedEvidenceIds.slice(0, topK)
    const overlap = top.filter((id) =>
      score.expectedEvidenceIds.includes(id)
    ).length
    if (overlap > 0) recallHits += 1
    mrrTotal += reciprocalRank(score.expectedEvidenceIds, top)
    overlapTotal +=
      score.expectedEvidenceIds.length === 0
        ? 0
        : overlap / score.expectedEvidenceIds.length
  }

  return {
    totalCases: cases.length,
    recallAtK: recallHits / cases.length,
    meanReciprocalRank: mrrTotal / cases.length,
    evidenceOverlap: overlapTotal / cases.length,
  }
}
