import { describe, expect, it } from "vitest"

import {
  resolveCareerPathingSelectedId,
  resolveCareerPathingSkillGapEmployeeId,
} from "../../lib/features/hrm/talent-management/career-pathing-development-plans/data/career-pathing-selection.shared"

describe("career-pathing URL selection", () => {
  it("resolveCareerPathingSelectedId uses query id when present in list", () => {
    const candidates = [{ id: "a" }, { id: "b" }]
    expect(resolveCareerPathingSelectedId(candidates, "b")).toBe("b")
  })

  it("resolveCareerPathingSelectedId falls back when query id is unknown", () => {
    const candidates = [{ id: "a" }, { id: "b" }]
    expect(resolveCareerPathingSelectedId(candidates, "missing")).toBe("a")
  })

  it("resolveCareerPathingSkillGapEmployeeId dedupes employees from target roles", () => {
    const targetRoles = [
      { employeeId: "emp-1", employeeName: "Ada" },
      { employeeId: "emp-2", employeeName: "Bob" },
      { employeeId: "emp-1", employeeName: "Ada" },
    ]
    expect(resolveCareerPathingSkillGapEmployeeId(targetRoles, "emp-2")).toBe(
      "emp-2"
    )
    expect(resolveCareerPathingSkillGapEmployeeId(targetRoles, undefined)).toBe(
      "emp-1"
    )
  })
})
