import { describe, expect, it } from "vitest"

import {
  assertEmploymentStatusTransition,
  deriveLifecycleStage,
  normalizeHrmEmploymentStatusForRead,
} from "../../lib/features/hrm/employee-management/employee-lifecycle-management/data/employee-lifecycle-stage.shared"

describe("deriveLifecycleStage", () => {
  it("prefers archived over other signals", () => {
    expect(
      deriveLifecycleStage({
        archivedAt: new Date("2026-01-01"),
        employmentStatus: "active",
        hasOpenOnboarding: true,
        hasOpenOffboarding: true,
      })
    ).toBe("archived")
  })

  it("surfaces onboarding when boarding is open", () => {
    expect(
      deriveLifecycleStage({
        archivedAt: null,
        employmentStatus: "active",
        hasOpenOnboarding: true,
        hasOpenOffboarding: false,
      })
    ).toBe("onboarding")
  })

  it("surfaces offboarding when checklist instance is open", () => {
    expect(
      deriveLifecycleStage({
        archivedAt: null,
        employmentStatus: "active",
        hasOpenOnboarding: false,
        hasOpenOffboarding: true,
      })
    ).toBe("offboarding")
  })

  it("keeps confirmed distinct from active", () => {
    expect(
      deriveLifecycleStage({
        archivedAt: null,
        employmentStatus: "confirmed",
        hasOpenOnboarding: false,
        hasOpenOffboarding: false,
      })
    ).toBe("confirmed")
  })

  it("normalizes legacy terminated rows to separated on reads", () => {
    expect(normalizeHrmEmploymentStatusForRead("terminated")).toBe("separated")
    expect(
      deriveLifecycleStage({
        archivedAt: null,
        employmentStatus: "terminated",
        hasOpenOnboarding: false,
        hasOpenOffboarding: false,
      })
    ).toBe("separated")
  })
})

describe("assertEmploymentStatusTransition", () => {
  it("allows probation to confirmed", () => {
    expect(() =>
      assertEmploymentStatusTransition("probation", "confirmed")
    ).not.toThrow()
  })

  it("rejects terminated to active", () => {
    expect(() =>
      assertEmploymentStatusTransition("terminated", "active")
    ).toThrow(/Invalid employment status transition/)
  })

  it("allows notice period to separated", () => {
    expect(() =>
      assertEmploymentStatusTransition("notice_period", "separated")
    ).not.toThrow()
  })
})
