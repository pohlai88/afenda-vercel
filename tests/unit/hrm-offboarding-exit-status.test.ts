import { describe, expect, it } from "vitest"

import { buildDefaultOffboardingChecklist } from "../../lib/features/hrm/employee-management/offboarding-exit-management/data/offboarding-defaults.shared"
import {
  isOffboardingChecklistComplete,
  deriveOffboardingTaskStatus,
} from "../../lib/features/hrm/employee-management/offboarding-exit-management/data/offboarding-exit-status.shared"
import { HRM_OFFBOARDING_TASK_KEYS } from "../../lib/features/hrm/employee-management/offboarding-exit-management/schemas/offboarding.schema"

describe("offboarding checklist defaults", () => {
  it("includes every HRM-OFF task key", () => {
    const checklist = buildDefaultOffboardingChecklist()
    expect(checklist).toHaveLength(HRM_OFFBOARDING_TASK_KEYS.length)
    for (const key of HRM_OFFBOARDING_TASK_KEYS) {
      expect(checklist.some((task) => task.taskKey === key)).toBe(true)
    }
  })
})

describe("deriveOffboardingTaskStatus", () => {
  it("marks incomplete tasks pending", () => {
    expect(deriveOffboardingTaskStatus({ completedAt: null })).toBe("pending")
  })

  it("marks past-due tasks overdue", () => {
    expect(
      deriveOffboardingTaskStatus({
        completedAt: null,
        dueDate: "2020-01-01",
        now: new Date("2026-05-01"),
      })
    ).toBe("overdue")
  })
})

describe("isOffboardingChecklistComplete", () => {
  it("requires every task completed", () => {
    const checklist = buildDefaultOffboardingChecklist().map(() => ({
      completedAt: new Date().toISOString(),
    }))
    expect(isOffboardingChecklistComplete(checklist)).toBe(true)
  })
})
