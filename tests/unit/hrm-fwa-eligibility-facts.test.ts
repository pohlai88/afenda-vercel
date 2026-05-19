import { describe, expect, it } from "vitest"

import {
  fwaEligibilityRuleMatchesFacts,
  type FwaEligibilityEmployeeFacts,
} from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/data/fwa-eligibility-facts.server.ts"

const BASE_FACTS = {
  departmentId: "dept-1",
  jobGradeId: "grade-1",
  positionId: "pos-1",
  workLocationCode: "KL-HQ",
  employmentType: "full_time",
  countryCode: "MY",
  workerCategory: "staff",
  legalEntityCode: "AFENDA-MY",
  policyGroupCode: "MONTHLY",
} as const satisfies FwaEligibilityEmployeeFacts

describe("FWA eligibility facts", () => {
  it("matches when all configured rule dimensions align", () => {
    const matched = fwaEligibilityRuleMatchesFacts(
      {
        departmentId: "dept-1",
        jobGradeId: null,
        employmentType: null,
        legalEntityCode: "AFENDA-MY",
        countryCode: "MY",
        workLocationCode: null,
        positionId: null,
        workerCategory: null,
        policyGroupCode: null,
      },
      BASE_FACTS
    )
    expect(matched).toBe(true)
  })

  it("rejects when country does not match", () => {
    const matched = fwaEligibilityRuleMatchesFacts(
      {
        departmentId: null,
        jobGradeId: null,
        employmentType: null,
        legalEntityCode: null,
        countryCode: "SG",
        workLocationCode: null,
        positionId: null,
        workerCategory: null,
        policyGroupCode: null,
      },
      BASE_FACTS
    )
    expect(matched).toBe(false)
  })

  it("treats unset rule dimensions as wildcards", () => {
    const matched = fwaEligibilityRuleMatchesFacts(
      {
        departmentId: null,
        jobGradeId: null,
        employmentType: null,
        legalEntityCode: null,
        countryCode: null,
        workLocationCode: null,
        positionId: null,
        workerCategory: null,
        policyGroupCode: null,
      },
      BASE_FACTS
    )
    expect(matched).toBe(true)
  })
})
