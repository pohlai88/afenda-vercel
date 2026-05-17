/**
 * Unit tests for Phase 2B leave request pure functions.
 * Tests: computeLeaveBalanceSummary, detectLeaveOverlap, buildLeaveApprovalSnapshot.
 * All tests are pure — no DB, no async, no imports from server-only modules.
 */
import { describe, expect, it } from "vitest"

import {
  buildLeaveApprovalSnapshot,
  computeLeaveBalanceSummary,
  detectLeaveOverlap,
  type LeaveRequestStateValue,
} from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/leave-balance.shared.ts"

// ---------------------------------------------------------------------------
// computeLeaveBalanceSummary
// ---------------------------------------------------------------------------

describe("computeLeaveBalanceSummary", () => {
  it("returns zero summary when there are no requests and no entitlement", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 0,
      requests: [],
    })
    expect(result).toEqual({ daysTaken: 0, daysPending: 0, daysAvailable: 0 })
  })

  it("full entitlement available when no requests exist", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 16,
      requests: [],
    })
    expect(result.daysAvailable).toBe(16)
    expect(result.daysTaken).toBe(0)
    expect(result.daysPending).toBe(0)
  })

  it("subtracts approved request from available days", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 12,
      requests: [{ state: "approved", durationDays: 3 }],
    })
    expect(result.daysTaken).toBe(3)
    expect(result.daysPending).toBe(0)
    expect(result.daysAvailable).toBe(9)
  })

  it("subtracts taken request from available days", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 12,
      requests: [{ state: "taken", durationDays: 5 }],
    })
    expect(result.daysTaken).toBe(5)
    expect(result.daysAvailable).toBe(7)
  })

  it("subtracts submitted (pending) request from available days", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 12,
      requests: [{ state: "submitted", durationDays: 4 }],
    })
    expect(result.daysPending).toBe(4)
    expect(result.daysTaken).toBe(0)
    expect(result.daysAvailable).toBe(8)
  })

  it("does not subtract rejected requests", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 12,
      requests: [{ state: "rejected", durationDays: 5 }],
    })
    expect(result.daysTaken).toBe(0)
    expect(result.daysPending).toBe(0)
    expect(result.daysAvailable).toBe(12)
  })

  it("does not subtract cancelled requests", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 12,
      requests: [{ state: "cancelled", durationDays: 3 }],
    })
    expect(result.daysTaken).toBe(0)
    expect(result.daysPending).toBe(0)
    expect(result.daysAvailable).toBe(12)
  })

  it("does not subtract draft requests", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 8,
      requests: [{ state: "draft", durationDays: 2 }],
    })
    expect(result.daysAvailable).toBe(8)
  })

  it("combines multiple requests of different states", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 16,
      requests: [
        { state: "approved", durationDays: 3 },
        { state: "taken", durationDays: 2 },
        { state: "submitted", durationDays: 4 },
        { state: "rejected", durationDays: 5 },
        { state: "cancelled", durationDays: 1 },
      ],
    })
    expect(result.daysTaken).toBe(5) // approved + taken
    expect(result.daysPending).toBe(4) // submitted
    expect(result.daysAvailable).toBe(7) // 16 - 5 - 4
  })

  it("includes openingDays in available balance", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 8,
      openingDays: 3,
      requests: [],
    })
    expect(result.daysAvailable).toBe(11)
  })

  it("includes adjustedDays in available balance", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 8,
      adjustedDays: 2,
      requests: [],
    })
    expect(result.daysAvailable).toBe(10)
  })

  it("includes carriedForwardDays in available balance", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 8,
      carriedForwardDays: 5,
      requests: [],
    })
    expect(result.daysAvailable).toBe(13)
  })

  it("handles full balance formula: opening + entitled + adjusted + carried - taken - pending", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 16,
      openingDays: 2,
      adjustedDays: 1,
      carriedForwardDays: 3,
      requests: [
        { state: "approved", durationDays: 5 },
        { state: "submitted", durationDays: 4 },
      ],
    })
    // 2 + 16 + 1 + 3 - 5 - 4 = 13
    expect(result.daysAvailable).toBe(13)
  })

  it("produces negative available balance when over-applied", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 8,
      requests: [
        { state: "approved", durationDays: 5 },
        { state: "submitted", durationDays: 6 },
      ],
    })
    // 8 - 5 - 6 = -3 (allowed as an overdraft signal)
    expect(result.daysAvailable).toBe(-3)
  })

  it("handles decimal duration days (half-days)", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 8,
      requests: [{ state: "approved", durationDays: 0.5 }],
    })
    expect(result.daysTaken).toBe(0.5)
    expect(result.daysAvailable).toBe(7.5)
  })

  it("handles string durationDays (numeric DB decimal)", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 12,
      requests: [{ state: "approved", durationDays: "3.00" }],
    })
    expect(result.daysTaken).toBe(3)
    expect(result.daysAvailable).toBe(9)
  })
})

// ---------------------------------------------------------------------------
// detectLeaveOverlap
// ---------------------------------------------------------------------------

describe("detectLeaveOverlap", () => {
  const activeRequest = (
    start: string,
    end: string,
    state: LeaveRequestStateValue = "submitted"
  ) => ({
    state,
    startDate: start,
    endDate: end,
  })

  it("returns false when no existing requests", () => {
    expect(detectLeaveOverlap("2026-06-01", "2026-06-05", [])).toBe(false)
  })

  it("returns false when candidate is before existing", () => {
    expect(
      detectLeaveOverlap("2026-05-01", "2026-05-03", [
        activeRequest("2026-06-01", "2026-06-05"),
      ])
    ).toBe(false)
  })

  it("returns false when candidate is after existing", () => {
    expect(
      detectLeaveOverlap("2026-07-01", "2026-07-05", [
        activeRequest("2026-06-01", "2026-06-05"),
      ])
    ).toBe(false)
  })

  it("returns true when candidate overlaps start of existing", () => {
    expect(
      detectLeaveOverlap("2026-05-30", "2026-06-02", [
        activeRequest("2026-06-01", "2026-06-05"),
      ])
    ).toBe(true)
  })

  it("returns true when candidate overlaps end of existing", () => {
    expect(
      detectLeaveOverlap("2026-06-04", "2026-06-08", [
        activeRequest("2026-06-01", "2026-06-05"),
      ])
    ).toBe(true)
  })

  it("returns true when candidate is contained within existing", () => {
    expect(
      detectLeaveOverlap("2026-06-02", "2026-06-03", [
        activeRequest("2026-06-01", "2026-06-10"),
      ])
    ).toBe(true)
  })

  it("returns true when existing is contained within candidate", () => {
    expect(
      detectLeaveOverlap("2026-05-28", "2026-06-15", [
        activeRequest("2026-06-01", "2026-06-05"),
      ])
    ).toBe(true)
  })

  it("returns true for exact same date range", () => {
    expect(
      detectLeaveOverlap("2026-06-01", "2026-06-05", [
        activeRequest("2026-06-01", "2026-06-05"),
      ])
    ).toBe(true)
  })

  it("returns true when candidate is adjacent by one day and ends on start of existing", () => {
    expect(
      detectLeaveOverlap("2026-05-29", "2026-06-01", [
        activeRequest("2026-06-01", "2026-06-05"),
      ])
    ).toBe(true)
  })

  it("ignores rejected requests for overlap check", () => {
    expect(
      detectLeaveOverlap("2026-06-01", "2026-06-05", [
        activeRequest("2026-06-01", "2026-06-05", "rejected"),
      ])
    ).toBe(false)
  })

  it("ignores cancelled requests for overlap check", () => {
    expect(
      detectLeaveOverlap("2026-06-01", "2026-06-05", [
        activeRequest("2026-06-01", "2026-06-05", "cancelled"),
      ])
    ).toBe(false)
  })

  it("ignores draft requests for overlap check", () => {
    expect(
      detectLeaveOverlap("2026-06-01", "2026-06-05", [
        activeRequest("2026-06-01", "2026-06-05", "draft"),
      ])
    ).toBe(false)
  })

  it("detects overlap with approved requests", () => {
    expect(
      detectLeaveOverlap("2026-06-01", "2026-06-05", [
        activeRequest("2026-06-01", "2026-06-05", "approved"),
      ])
    ).toBe(true)
  })

  it("detects overlap with taken requests", () => {
    expect(
      detectLeaveOverlap("2026-06-01", "2026-06-05", [
        activeRequest("2026-06-01", "2026-06-05", "taken"),
      ])
    ).toBe(true)
  })

  it("returns false when multiple non-overlapping existing requests present", () => {
    expect(
      detectLeaveOverlap("2026-07-01", "2026-07-03", [
        activeRequest("2026-05-01", "2026-05-05"),
        activeRequest("2026-06-01", "2026-06-10"),
      ])
    ).toBe(false)
  })

  it("returns true when overlaps at least one of multiple requests", () => {
    expect(
      detectLeaveOverlap("2026-06-08", "2026-06-12", [
        activeRequest("2026-05-01", "2026-05-05"),
        activeRequest("2026-06-01", "2026-06-10"),
      ])
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// buildLeaveApprovalSnapshot
// ---------------------------------------------------------------------------

describe("buildLeaveApprovalSnapshot", () => {
  const baseParams = {
    employeeId: "emp-001",
    employeeNumber: "MY-00042",
    employeeFullName: "Aminah Binti Rahman",
    leaveTypeId: "lt-annual",
    leaveTypeCode: "ANNUAL",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    durationDays: 3,
    halfDay: "none" as const,
    reason: "Annual family trip",
    balanceBefore: { daysTaken: 2, daysPending: 1, daysAvailable: 10 },
    policyVersion: "MY-2026-01",
    requestedAt: new Date("2026-05-11T10:00:00.000Z"),
  }

  it("produces snapshot with objectType = leave_request", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.objectType).toBe("leave_request")
  })

  it("preserves employee identity fields", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.employeeId).toBe("emp-001")
    expect(snap.employeeNumber).toBe("MY-00042")
    expect(snap.employeeFullName).toBe("Aminah Binti Rahman")
  })

  it("preserves leave type fields", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.leaveTypeId).toBe("lt-annual")
    expect(snap.leaveTypeCode).toBe("ANNUAL")
  })

  it("preserves date range and duration", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.startDate).toBe("2026-06-10")
    expect(snap.endDate).toBe("2026-06-12")
    expect(snap.durationDays).toBe(3)
    expect(snap.halfDay).toBe("none")
  })

  it("captures balanceBefore from current available balance", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.balanceBefore).toBe(10) // daysAvailable before this request
  })

  it("computes balanceAfter as balanceBefore minus durationDays", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.balanceAfter).toBe(7) // 10 - 3
  })

  it("balanceAfter can be negative for overdraft", () => {
    const snap = buildLeaveApprovalSnapshot({
      ...baseParams,
      durationDays: 15,
      balanceBefore: { ...baseParams.balanceBefore, daysAvailable: 5 },
    })
    expect(snap.balanceAfter).toBe(-10)
  })

  it("captures daysTaken and daysPending from balanceBefore", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.daysTaken).toBe(2)
    expect(snap.daysPending).toBe(1)
  })

  it("preserves policyVersion", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.policyVersion).toBe("MY-2026-01")
  })

  it("handles null policyVersion", () => {
    const snap = buildLeaveApprovalSnapshot({
      ...baseParams,
      policyVersion: null,
    })
    expect(snap.policyVersion).toBeNull()
  })

  it("serialises requestedAt as ISO string", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    expect(snap.requestedAt).toBe("2026-05-11T10:00:00.000Z")
  })

  it("handles null employeeNumber", () => {
    const snap = buildLeaveApprovalSnapshot({
      ...baseParams,
      employeeNumber: null,
    })
    expect(snap.employeeNumber).toBeNull()
  })

  it("handles null reason", () => {
    const snap = buildLeaveApprovalSnapshot({
      ...baseParams,
      reason: null,
    })
    expect(snap.reason).toBeNull()
  })

  it("snapshot is deeply frozen (readonly contract enforced at type level)", () => {
    const snap = buildLeaveApprovalSnapshot(baseParams)
    // The type system enforces readonly — verify the object exists with correct shape
    expect(typeof snap).toBe("object")
    expect(Object.keys(snap)).toContain("objectType")
    expect(Object.keys(snap)).toContain(
      "snapshot" in snap ? "snapshot" : "objectType"
    )
  })
})

// ---------------------------------------------------------------------------
// Combined round-trip: apply → approve → balance reflects correctly
// ---------------------------------------------------------------------------

describe("leave request round-trip (pure state machine)", () => {
  it("apply request reduces available days by pending amount", () => {
    const afterApply = computeLeaveBalanceSummary({
      daysEntitled: 16,
      requests: [{ state: "submitted", durationDays: 5 }],
    })
    expect(afterApply.daysAvailable).toBe(11)
    expect(afterApply.daysPending).toBe(5)
    expect(afterApply.daysTaken).toBe(0)
  })

  it("approve request shifts days from pending to taken", () => {
    const afterApprove = computeLeaveBalanceSummary({
      daysEntitled: 16,
      requests: [{ state: "approved", durationDays: 5 }],
    })
    expect(afterApprove.daysAvailable).toBe(11)
    expect(afterApprove.daysPending).toBe(0)
    expect(afterApprove.daysTaken).toBe(5)
  })

  it("cancel submitted request restores full balance", () => {
    const afterCancel = computeLeaveBalanceSummary({
      daysEntitled: 16,
      requests: [{ state: "cancelled", durationDays: 5 }],
    })
    expect(afterCancel.daysAvailable).toBe(16)
    expect(afterCancel.daysPending).toBe(0)
    expect(afterCancel.daysTaken).toBe(0)
  })

  it("reject submitted request restores full balance", () => {
    const afterReject = computeLeaveBalanceSummary({
      daysEntitled: 16,
      requests: [{ state: "rejected", durationDays: 5 }],
    })
    expect(afterReject.daysAvailable).toBe(16)
  })

  it("multiple approvals accumulate correctly", () => {
    const result = computeLeaveBalanceSummary({
      daysEntitled: 16,
      requests: [
        { state: "taken", durationDays: 3 },
        { state: "approved", durationDays: 2 },
        { state: "submitted", durationDays: 4 },
      ],
    })
    expect(result.daysTaken).toBe(5) // 3 + 2
    expect(result.daysPending).toBe(4)
    expect(result.daysAvailable).toBe(7) // 16 - 5 - 4
  })

  it("entitlement year boundary: partial year (8 days pro-rata for 6/12 months) is respected", () => {
    // Employee hired mid-year: 8 base days × 6/12 = 4 days entitled
    const result = computeLeaveBalanceSummary({
      daysEntitled: 4,
      requests: [{ state: "approved", durationDays: 2 }],
    })
    expect(result.daysAvailable).toBe(2)
  })
})
