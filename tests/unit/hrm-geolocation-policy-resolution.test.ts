import { describe, expect, it } from "vitest"

import {
  pickMostSpecificRemoteCheckinPolicy,
  remoteCheckinPolicyMatchesEmployee,
  remoteCheckinPolicyScopePriority,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/data/geolocation-policy-resolution.shared.ts"

const FACTS = {
  departmentId: "dept-1",
  positionId: "pos-1",
  employmentType: "permanent",
  policyGroupCode: "PG-A",
} as const

describe("remoteCheckinPolicyMatchesEmployee", () => {
  it("matches org scope for any employee", () => {
    expect(
      remoteCheckinPolicyMatchesEmployee({
        scopeKind: "org",
        scopeRef: null,
        employeeId: "emp-1",
        facts: FACTS,
      })
    ).toBe(true)
  })

  it("matches employee scope by employee id", () => {
    expect(
      remoteCheckinPolicyMatchesEmployee({
        scopeKind: "employee",
        scopeRef: "emp-1",
        employeeId: "emp-1",
        facts: FACTS,
      })
    ).toBe(true)
    expect(
      remoteCheckinPolicyMatchesEmployee({
        scopeKind: "employee",
        scopeRef: "emp-2",
        employeeId: "emp-1",
        facts: FACTS,
      })
    ).toBe(false)
  })

  it("matches department scope by department id", () => {
    expect(
      remoteCheckinPolicyMatchesEmployee({
        scopeKind: "department",
        scopeRef: "dept-1",
        employeeId: "emp-1",
        facts: FACTS,
      })
    ).toBe(true)
  })
})

describe("pickMostSpecificRemoteCheckinPolicy", () => {
  it("prefers employee over department over org", () => {
    const policies = [
      { scopeKind: "org" as const, id: "org" },
      { scopeKind: "department" as const, id: "dept" },
      { scopeKind: "employee" as const, id: "emp" },
    ]
    expect(pickMostSpecificRemoteCheckinPolicy(policies)?.id).toBe("emp")
    expect(remoteCheckinPolicyScopePriority("employee")).toBeLessThan(
      remoteCheckinPolicyScopePriority("org")
    )
  })
})
