import { describe, expect, it } from "vitest"

import {
  managerChainDepthClamped,
  readOtmApprovalStage,
  resolveInitialOtmApprovalStage,
} from "../../lib/features/hrm/time-attendance/overtime-management/data/otm-approval-routing.shared"

describe("managerChainDepthClamped", () => {
  it("clamps depth to 1..5", () => {
    expect(managerChainDepthClamped(0)).toBe(1)
    expect(managerChainDepthClamped(3)).toBe(3)
    expect(managerChainDepthClamped(99)).toBe(5)
  })
})

describe("resolveInitialOtmApprovalStage", () => {
  it("uses HR-only when second approval is disabled", () => {
    expect(
      resolveInitialOtmApprovalStage({
        policy: { requireHrSecondApproval: false },
        managerApproverUserId: "mgr-1",
      })
    ).toBe("hr")
  })

  it("starts at manager when HR second approval is required and manager exists", () => {
    expect(
      resolveInitialOtmApprovalStage({
        policy: { requireHrSecondApproval: true },
        managerApproverUserId: "mgr-1",
      })
    ).toBe("manager")
  })

  it("falls back to HR when no manager user is linked", () => {
    expect(
      resolveInitialOtmApprovalStage({
        policy: { requireHrSecondApproval: true },
        managerApproverUserId: null,
      })
    ).toBe("hr")
  })
})

describe("readOtmApprovalStage", () => {
  it("ignores snapshot stage when policy disables second approval", () => {
    expect(
      readOtmApprovalStage(
        { approvalStage: "manager" },
        { requireHrSecondApproval: false }
      )
    ).toBe("hr")
  })

  it("reads HR stage from snapshot when enabled", () => {
    expect(
      readOtmApprovalStage(
        { approvalStage: "hr" },
        { requireHrSecondApproval: true }
      )
    ).toBe("hr")
  })

  it("defaults to manager when second approval is on and snapshot lacks HR stage", () => {
    expect(
      readOtmApprovalStage(null, { requireHrSecondApproval: true })
    ).toBe("manager")
  })
})
