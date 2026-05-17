import { describe, expect, it } from "vitest"

import {
  parseRequiredSkillCodesInput,
  scoreRequisitionSkillMatch,
} from "../../lib/features/hrm/talent-management/recruitment-applicant-tracking/data/recruitment-workflow.shared.ts"

describe("parseRequiredSkillCodesInput", () => {
  it("normalizes comma-separated codes", () => {
    expect(parseRequiredSkillCodesInput("TypeScript, react ")).toEqual([
      "typescript",
      "react",
    ])
  })
})

describe("scoreRequisitionSkillMatch", () => {
  it("returns full match when no requirements", () => {
    expect(scoreRequisitionSkillMatch([], ["typescript"])).toEqual({
      matchedCodes: [],
      missingCodes: [],
      matchRatio: 1,
    })
  })

  it("computes matched and missing codes", () => {
    const result = scoreRequisitionSkillMatch(
      ["typescript", "react"],
      ["TypeScript", "node"]
    )
    expect(result.matchedCodes).toEqual(["typescript"])
    expect(result.missingCodes).toEqual(["react"])
    expect(result.matchRatio).toBeCloseTo(0.5)
  })
})
