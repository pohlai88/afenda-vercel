import { describe, expect, it } from "vitest"

import {
  otmApprovalRouteMatchesContext,
  pickFirstMatchingOtmApprovalRoute,
  type OtmApprovalRoutingContext,
} from "../../lib/features/hrm/time-attendance/overtime-management/data/otm-approval-route-matching.shared"

const BASE_CONTEXT = {
  departmentId: "dept-a",
  jobGradeId: "grade-1",
  workLocationCode: "KL",
  costCenterCode: "CC-100",
  estimatedAmountCents: 50_000,
  hasEligibilityException: false,
  hasPolicyException: false,
} as const satisfies OtmApprovalRoutingContext

describe("otmApprovalRouteMatchesContext", () => {
  it("matches when all rule criteria are blank", () => {
    expect(
      otmApprovalRouteMatchesContext(
        {
          departmentId: null,
          costCenterCode: null,
          workLocationCode: null,
          jobGradeId: null,
          minAmountCents: null,
          maxAmountCents: null,
          requiresEligibilityException: null,
          requiresPolicyException: null,
        },
        BASE_CONTEXT
      )
    ).toBe(true)
  })

  it("rejects department mismatch", () => {
    expect(
      otmApprovalRouteMatchesContext(
        {
          departmentId: "dept-b",
          costCenterCode: null,
          workLocationCode: null,
          jobGradeId: null,
          minAmountCents: null,
          maxAmountCents: null,
          requiresEligibilityException: null,
          requiresPolicyException: null,
        },
        BASE_CONTEXT
      )
    ).toBe(false)
  })

  it("enforces amount band when estimate is known", () => {
    expect(
      otmApprovalRouteMatchesContext(
        {
          departmentId: null,
          costCenterCode: null,
          workLocationCode: null,
          jobGradeId: null,
          minAmountCents: 40_000,
          maxAmountCents: 60_000,
          requiresEligibilityException: null,
          requiresPolicyException: null,
        },
        BASE_CONTEXT
      )
    ).toBe(true)

    expect(
      otmApprovalRouteMatchesContext(
        {
          departmentId: null,
          costCenterCode: null,
          workLocationCode: null,
          jobGradeId: null,
          minAmountCents: 60_001,
          maxAmountCents: null,
          requiresEligibilityException: null,
          requiresPolicyException: null,
        },
        BASE_CONTEXT
      )
    ).toBe(false)
  })

  it("requires eligibility exception flag when rule demands it", () => {
    expect(
      otmApprovalRouteMatchesContext(
        {
          departmentId: null,
          costCenterCode: null,
          workLocationCode: null,
          jobGradeId: null,
          minAmountCents: null,
          maxAmountCents: null,
          requiresEligibilityException: true,
          requiresPolicyException: null,
        },
        { ...BASE_CONTEXT, hasEligibilityException: true }
      )
    ).toBe(true)

    expect(
      otmApprovalRouteMatchesContext(
        {
          departmentId: null,
          costCenterCode: null,
          workLocationCode: null,
          jobGradeId: null,
          minAmountCents: null,
          maxAmountCents: null,
          requiresEligibilityException: true,
          requiresPolicyException: null,
        },
        BASE_CONTEXT
      )
    ).toBe(false)
  })
})

describe("pickFirstMatchingOtmApprovalRoute", () => {
  it("returns lowest priority active rule", () => {
    const picked = pickFirstMatchingOtmApprovalRoute(
      [
        {
          id: "late",
          label: null,
          priority: 200,
          departmentId: "dept-a",
          costCenterCode: null,
          workLocationCode: null,
          jobGradeId: null,
          minAmountCents: null,
          maxAmountCents: null,
          requiresEligibilityException: null,
          requiresPolicyException: null,
          approverKind: "hr_pool",
          managerChainDepth: null,
          targetUserId: null,
          isActive: true,
        },
        {
          id: "first",
          label: null,
          priority: 10,
          departmentId: "dept-a",
          costCenterCode: null,
          workLocationCode: null,
          jobGradeId: null,
          minAmountCents: null,
          maxAmountCents: null,
          requiresEligibilityException: null,
          requiresPolicyException: null,
          approverKind: "department_head",
          managerChainDepth: null,
          targetUserId: null,
          isActive: true,
        },
      ],
      BASE_CONTEXT
    )

    expect(picked?.id).toBe("first")
  })
})
