import { describe, expect, it } from "vitest"

import {
  canCommentOnGoal,
  canEditMilestone,
  createKpiGoalFormSchema,
  derivePercentCompleteFromMilestones,
} from "../../lib/features/hrm/talent-management/competency-skills-framework/schemas/kpi-goal.schema"

describe("KPI goal helpers", () => {
  it("derivePercentCompleteFromMilestones counts completed milestones", () => {
    expect(
      derivePercentCompleteFromMilestones([
        {
          completedAt: new Date(),
          startValue: null,
          endValue: null,
          currentValue: null,
        },
        {
          completedAt: null,
          startValue: null,
          endValue: null,
          currentValue: null,
        },
      ])
    ).toBe(50)
  })

  it("derivePercentCompleteFromMilestones uses numeric span when present", () => {
    expect(
      derivePercentCompleteFromMilestones([
        {
          completedAt: null,
          startValue: "0",
          endValue: "100",
          currentValue: "25",
        },
      ])
    ).toBe(25)
  })

  it("canCommentOnGoal allows owner and shared employees only", () => {
    const goal = {
      ownerEmployeeId: "e1",
      sharedWithEmployeeIds: ["e2"],
    }
    expect(canCommentOnGoal(goal, { userId: "u1", employeeId: "e1" })).toBe(
      true
    )
    expect(canCommentOnGoal(goal, { userId: "u2", employeeId: "e2" })).toBe(
      true
    )
    expect(canCommentOnGoal(goal, { userId: "u3", employeeId: "e9" })).toBe(
      false
    )
    expect(canCommentOnGoal(goal, { userId: "u3", employeeId: null })).toBe(
      false
    )
  })

  it("canEditMilestone mirrors canCommentOnGoal", () => {
    const goal = { ownerEmployeeId: "e1", sharedWithEmployeeIds: [] as const }
    expect(canEditMilestone(goal, { userId: "u1", employeeId: "e1" })).toBe(
      true
    )
    expect(canEditMilestone(goal, { userId: "u2", employeeId: "e2" })).toBe(
      false
    )
  })

  it("createKpiGoalFormSchema accepts blank alignsWithGoalId", () => {
    const parsed = createKpiGoalFormSchema.safeParse({
      orgSlug: "acme",
      ownerEmployeeId: "00000000-0000-4000-8000-000000000001",
      title: "Ship KPI goals",
      description: null,
      dueDate: "2026-12-31",
      alignsWithGoalId: "",
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.alignsWithGoalId).toBeNull()
    }
  })
})
