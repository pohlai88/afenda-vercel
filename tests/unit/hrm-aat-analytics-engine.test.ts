import { describe, expect, it } from "vitest"

import {
  classifyAbsenceRiskTier,
  computeAbsenceRate,
  computeTrendDirection,
  countInclusiveCalendarDays,
  formatAbsenceRatePercent,
  isHolidayAdjacentIsoDate,
  isMissingPunchAttendance,
  isMondayOrFridayIsoDate,
  isShortAbsenceDurationDays,
  isUnplannedLeaveTypeCode,
  maskAbsenceReason,
  resolveAatDateRange,
} from "../../lib/features/hrm/time-attendance/absence-analytics-trends/data/aat-analytics-engine.shared.ts"

describe("AAT analytics engine", () => {
  it("resolves a 30-day inclusive range", () => {
    const range = resolveAatDateRange({
      period: "30d",
      anchor: new Date("2026-05-19T12:00:00.000Z"),
    })
    expect(range.endDate).toBe("2026-05-19")
    expect(range.startDate).toBe("2026-04-20")
    expect(countInclusiveCalendarDays(range.startDate, range.endDate)).toBe(30)
  })

  it("computes absence rate against employee-days capacity", () => {
    expect(
      computeAbsenceRate({
        lostWorkdays: 15,
        activeEmployeeCount: 10,
        calendarDays: 30,
      })
    ).toBeCloseTo(0.05)
  })

  it("classifies risk tiers from default thresholds", () => {
    expect(
      classifyAbsenceRiskTier({
        absenceRate: 0.05,
        absenceFrequency: 1,
      })
    ).toBe("normal")

    expect(
      classifyAbsenceRiskTier({
        absenceRate: 0.2,
        absenceFrequency: 2,
      })
    ).toBe("high_risk")
  })

  it("detects trend direction with stable band", () => {
    expect(computeTrendDirection({ currentRate: 0.1, priorRate: 0.08 })).toBe(
      "worsening"
    )
    expect(computeTrendDirection({ currentRate: 0.05, priorRate: 0.08 })).toBe(
      "improving"
    )
    expect(computeTrendDirection({ currentRate: 0.081, priorRate: 0.08 })).toBe(
      "stable"
    )
  })

  it("flags unplanned leave type codes and weekday patterns", () => {
    expect(isUnplannedLeaveTypeCode("unpaid")).toBe(true)
    expect(isUnplannedLeaveTypeCode("annual")).toBe(false)
    expect(isMondayOrFridayIsoDate("2026-05-18")).toBe(true)
    expect(isShortAbsenceDurationDays(1.5)).toBe(true)
  })

  it("detects missing punch on scheduled days without clock events", () => {
    expect(
      isMissingPunchAttendance({
        scheduledMinutes: 480,
        firstClockInAt: null,
        lastClockOutAt: null,
        absenceCode: null,
      })
    ).toBe(true)
    expect(
      isMissingPunchAttendance({
        scheduledMinutes: 480,
        firstClockInAt: new Date("2026-05-19T09:00:00.000Z"),
        lastClockOutAt: null,
        absenceCode: null,
      })
    ).toBe(false)
  })

  it("masks sensitive absence reasons for unauthorized viewers", () => {
    expect(
      maskAbsenceReason({ reason: "Medical", canViewSensitive: false })
    ).toBe("Restricted")
    expect(
      maskAbsenceReason({ reason: "Medical", canViewSensitive: true })
    ).toBe("Medical")
  })

  it("formats absence rate as percentage", () => {
    expect(formatAbsenceRatePercent(0.1234)).toBe("12.3%")
  })

  it("detects holiday-adjacent absence dates", () => {
    const holidays = new Set(["2026-05-20"])
    expect(isHolidayAdjacentIsoDate("2026-05-19", holidays)).toBe(true)
    expect(isHolidayAdjacentIsoDate("2026-05-21", holidays)).toBe(true)
    expect(isHolidayAdjacentIsoDate("2026-05-18", holidays)).toBe(false)
  })
})
