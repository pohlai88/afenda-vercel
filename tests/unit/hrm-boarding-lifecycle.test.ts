import { describe, expect, it } from "vitest"

import {
  DEFAULT_OFFBOARDING_TEMPLATE,
  DEFAULT_ONBOARDING_TEMPLATE,
} from "../../lib/features/hrm/employee-management/employee-lifecycle-management/data/boarding-defaults.shared.ts"
import {
  deriveBoardingInstanceStatus,
  isOpenBoardingStatus,
  requiredBoardingTasksSatisfied,
} from "../../lib/features/hrm/employee-management/employee-lifecycle-management/data/boarding-status.shared.ts"
import {
  scoreBoardingTemplate,
  selectBestBoardingTemplate,
} from "../../lib/features/hrm/employee-management/employee-lifecycle-management/data/boarding-template-matching.shared.ts"

describe("boarding template matching", () => {
  it("scores null appliesTo as 0 and still selects a single candidate", () => {
    const picked = selectBestBoardingTemplate(
      [
        {
          id: "a",
          code: "z_last",
          versionNumber: 1,
          appliesTo: null,
        },
      ],
      { countryCode: "MY" }
    )
    expect(picked?.code).toBe("z_last")
    expect(scoreBoardingTemplate(null, { countryCode: "MY" })).toBe(0)
  })

  it("returns null when a required criterion is missing on the employee", () => {
    const score = scoreBoardingTemplate(
      { countryCode: "MY", departmentId: "d1" },
      { countryCode: "MY" }
    )
    expect(score).toBeNull()
  })

  it("prefers higher score, then lexicographically lower code on tie", () => {
    const a = selectBestBoardingTemplate(
      [
        {
          id: "1",
          code: "beta",
          versionNumber: 1,
          appliesTo: { countryCode: "MY" },
        },
        {
          id: "2",
          code: "alpha",
          versionNumber: 1,
          appliesTo: { countryCode: "MY", departmentId: "d1" },
        },
      ],
      { countryCode: "MY", departmentId: "d1" }
    )
    expect(a?.code).toBe("alpha")
  })
})

describe("boarding instance status", () => {
  it("pending when no tasks", () => {
    expect(deriveBoardingInstanceStatus([])).toBe("pending")
  })

  it("blocked beats in_progress", () => {
    expect(
      deriveBoardingInstanceStatus([
        { required: true, status: "in_progress" },
        { required: true, status: "blocked" },
      ])
    ).toBe("blocked")
  })

  it("completed when required tasks satisfied", () => {
    expect(
      deriveBoardingInstanceStatus([
        { required: true, status: "completed" },
        { required: false, status: "pending" },
      ])
    ).toBe("completed")
  })

  it("isOpenBoardingStatus matches product states", () => {
    expect(isOpenBoardingStatus("pending")).toBe(true)
    expect(isOpenBoardingStatus("in_progress")).toBe(true)
    expect(isOpenBoardingStatus("blocked")).toBe(true)
    expect(isOpenBoardingStatus("completed")).toBe(false)
  })

  it("requiredBoardingTasksSatisfied ignores optional tasks", () => {
    expect(
      requiredBoardingTasksSatisfied([
        { required: true, status: "completed" },
        { required: false, status: "pending" },
      ])
    ).toBe(true)
  })
})

describe("default boarding templates", () => {
  it("onboarding has four ordered tasks with three required", () => {
    expect(DEFAULT_ONBOARDING_TEMPLATE.tasks).toHaveLength(4)
    const orders = DEFAULT_ONBOARDING_TEMPLATE.tasks.map((t) => t.sortOrder)
    expect(orders).toEqual([10, 20, 30, 40])
    expect(
      DEFAULT_ONBOARDING_TEMPLATE.tasks.filter((t) => t.required).length
    ).toBe(3)
  })

  it("offboarding has four required tasks", () => {
    expect(DEFAULT_OFFBOARDING_TEMPLATE.tasks).toHaveLength(4)
    expect(DEFAULT_OFFBOARDING_TEMPLATE.tasks.every((t) => t.required)).toBe(
      true
    )
  })
})
