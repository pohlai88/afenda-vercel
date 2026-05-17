import { describe, expect, it } from "vitest"

import {
  buildLeaveRequestPolicySnapshot,
  computeCarryForwardExpiry,
  computeLeaveRequestDuration,
  validateLeavePolicyForRequest,
} from "../../lib/features/hrm/workforce-time-attendance/data/leave-absence.shared.ts"
import { applyLeaveFormSchema } from "../../lib/features/hrm/workforce-time-attendance/schemas/leave-request.schema"

describe("computeLeaveRequestDuration", () => {
  it("counts working days and skips weekends", () => {
    expect(
      computeLeaveRequestDuration({
        startDate: "2026-05-15",
        endDate: "2026-05-18",
      })
    ).toBe(2)
  })

  it("skips public holidays inside the requested range", () => {
    expect(
      computeLeaveRequestDuration({
        startDate: "2026-05-18",
        endDate: "2026-05-20",
        publicHolidayDates: ["2026-05-19"],
      })
    ).toBe(2)
  })

  it("returns 0.5 for a working half-day request", () => {
    expect(
      computeLeaveRequestDuration({
        startDate: "2026-05-18",
        endDate: "2026-05-18",
        halfDay: "morning",
      })
    ).toBe(0.5)
  })
})

describe("validateLeavePolicyForRequest", () => {
  it("blocks requests that would exceed available balance", () => {
    const result = validateLeavePolicyForRequest({
      startDate: "2026-05-18",
      endDate: "2026-05-20",
      durationDays: 3,
      daysAvailable: 2,
      allowNegativeBalance: false,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.code)).toContain(
        "insufficient_balance"
      )
    }
  })

  it("enforces notice period, attachment, gender, and service rules", () => {
    const result = validateLeavePolicyForRequest({
      requestedAt: "2026-05-15",
      startDate: "2026-05-16",
      endDate: "2026-05-16",
      durationDays: 1,
      daysAvailable: 10,
      minNoticeDays: 3,
      requiresAttachment: true,
      employeeGender: "male",
      genderRestriction: "female",
      employeeStartDate: "2026-05-01",
      minServiceDays: 30,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining([
          "minimum_notice",
          "attachment_required",
          "gender_ineligible",
          "service_ineligible",
        ])
      )
    }
  })
})

describe("leave policy snapshots", () => {
  it("captures duration source and applied rules for audit-stable approvals", () => {
    const snapshot = buildLeaveRequestPolicySnapshot({
      requestedAt: "2026-05-15",
      startDate: "2026-05-18",
      endDate: "2026-05-20",
      durationDays: 2.5,
      computedDurationDays: 3,
      durationSource: "manual_override",
      durationOverrideReason: "Approved half-day payroll correction.",
      daysAvailable: 10,
      leaveTypeCode: "ANNUAL",
      policyVersion: "MY-EA-2023-01",
      minNoticeDays: 2,
      maxConsecutiveDays: 14,
      allowNegativeBalance: false,
      requiresAttachment: false,
    })

    expect(snapshot.policyVersion).toBe("MY-EA-2023-01")
    expect(snapshot.durationSource).toBe("manual_override")
    expect(snapshot.computedDurationDays).toBe(3)
    expect(snapshot.appliedRules.minNoticeDays).toBe(2)
    expect(snapshot.appliedRules.maxConsecutiveDays).toBe(14)
  })

  it("computes carry-forward expiry from the source entitlement year", () => {
    expect(
      computeCarryForwardExpiry({ entitlementYear: 2026, expiryMonths: 3 })
    ).toBe("2027-03-31")
  })
})

describe("applyLeaveFormSchema", () => {
  const validInput = {
    employeeId: "00000000-0000-4000-8000-000000000001",
    leaveTypeId: "00000000-0000-4000-8000-000000000002",
    startDate: "2026-05-18",
    endDate: "2026-05-18",
    halfDay: "none",
    reason: null,
    evidenceDocumentId: null,
    policyVersion: null,
  }

  it("allows normal requests without manual duration", () => {
    expect(applyLeaveFormSchema.safeParse(validInput).success).toBe(true)
  })

  it("requires an audit reason when HR overrides duration", () => {
    const parsed = applyLeaveFormSchema.safeParse({
      ...validInput,
      durationDays: 0.5,
      durationOverrideReason: null,
    })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.durationOverrideReason).toEqual(
        ["Duration override reason is required when duration is overridden"]
      )
    }
  })
})
