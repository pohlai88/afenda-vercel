export type BoardingTemplateCriteria = {
  readonly countryCode?: string | null
  readonly departmentId?: string | null
  readonly positionId?: string | null
  readonly gradeId?: string | null
  readonly contractType?: string | null
  readonly exitType?: string | null
}

export type BoardingTemplateCandidate = {
  readonly id: string
  readonly code: string
  readonly versionNumber: number
  readonly appliesTo: unknown
}

const CRITERIA_KEYS = [
  "countryCode",
  "departmentId",
  "positionId",
  "gradeId",
  "contractType",
  "exitType",
] as const satisfies readonly (keyof BoardingTemplateCriteria)[]

export function selectBestBoardingTemplate<T extends BoardingTemplateCandidate>(
  candidates: readonly T[],
  criteria: BoardingTemplateCriteria
): T | null {
  let best: { candidate: T; score: number } | null = null

  for (const candidate of candidates) {
    const score = scoreBoardingTemplate(candidate.appliesTo, criteria)
    if (score === null) continue
    if (
      best === null ||
      score > best.score ||
      (score === best.score &&
        candidate.code.localeCompare(best.candidate.code) < 0)
    ) {
      best = { candidate, score }
    }
  }

  return best?.candidate ?? null
}

export function scoreBoardingTemplate(
  appliesTo: unknown,
  criteria: BoardingTemplateCriteria
): number | null {
  if (!appliesTo || typeof appliesTo !== "object" || Array.isArray(appliesTo)) {
    return 0
  }

  let score = 0
  const record = appliesTo as Record<string, unknown>
  for (const key of CRITERIA_KEYS) {
    const expected = record[key]
    if (expected === undefined || expected === null || expected === "") {
      continue
    }
    const actual = criteria[key]
    if (!actual) {
      return null
    }
    if (Array.isArray(expected)) {
      const values = expected.filter((v): v is string => typeof v === "string")
      if (!values.includes(actual)) {
        return null
      }
      score += 1
      continue
    }
    if (typeof expected !== "string" || expected !== actual) {
      return null
    }
    score += 1
  }

  return score
}
