import { describe, expect, it } from "vitest"

import {
  collectDescendantDepartmentIds,
  departmentIdWithinOrgUnitAncestor,
} from "../../lib/features/hrm/time-attendance/shift-scheduling/data/sft-org-unit-filter.shared"

describe("sft org unit filter helpers", () => {
  const parentMap = new Map<string, string | null>([
    ["legal-1", null],
    ["dept-a", "legal-1"],
    ["dept-b", "dept-a"],
    ["team-1", "legal-1"],
  ])

  it("collects descendant department ids including root", () => {
    const ids = collectDescendantDepartmentIds({
      rootOrgUnitId: "legal-1",
      parentMap,
    })
    expect([...ids].sort()).toEqual(
      ["dept-a", "dept-b", "legal-1", "team-1"].sort()
    )
  })

  it("matches employee department within ancestor chain", () => {
    expect(
      departmentIdWithinOrgUnitAncestor({
        departmentId: "dept-b",
        ancestorOrgUnitId: "legal-1",
        parentMap,
      })
    ).toBe(true)
    expect(
      departmentIdWithinOrgUnitAncestor({
        departmentId: "team-1",
        ancestorOrgUnitId: "dept-a",
        parentMap,
      })
    ).toBe(false)
  })
})
