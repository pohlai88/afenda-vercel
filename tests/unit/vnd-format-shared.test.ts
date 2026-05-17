import { describe, expect, it } from "vitest"

import {
  countBusinessDaysVn,
  formatDateVnLiterary,
  formatVnd,
  isVnHolidayYmd,
  parseVnLiteraryDate,
  parseVnd,
} from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/vietnam/format/vnd-and-date.shared.ts"
import {
  capContributoryWageVnd202401,
  estimateVnSickLeaveAllowanceV202401,
  projectVnMaternityBenefitV202401,
  VN_SOCIAL_INSURANCE_SALARY_CAP_VND_2024,
} from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/vietnam/leave-benefits/v2024-01.shared.ts"

describe("formatVnd / parseVnd", () => {
  it("formats with dot grouping and ₫ suffix", () => {
    expect(formatVnd(1_234_567)).toBe("1.234.567 ₫")
    expect(formatVnd(-1000)).toBe("-1.000 ₫")
  })

  it("parses formatted strings", () => {
    expect(parseVnd("1.234.567 ₫")).toBe(1_234_567)
    expect(parseVnd("500")).toBe(500)
  })
})

describe("literary Vietnamese dates", () => {
  it("round-trips UTC calendar day", () => {
    const d = new Date(Date.UTC(2024, 3, 15))
    const s = formatDateVnLiterary(d)
    expect(s).toBe("ngày 15 tháng 4 năm 2024")
    expect(parseVnLiteraryDate(s)?.toISOString()).toBe(d.toISOString())
  })
})

describe("countBusinessDaysVn", () => {
  it("excludes weekends and listed holidays", () => {
    const start = new Date(Date.UTC(2024, 0, 1)) // Mon
    const end = new Date(Date.UTC(2024, 0, 7)) // Sun
    const holidays = new Set(["2024-01-01"])
    expect(countBusinessDaysVn(start, end, holidays)).toBe(4)
    expect(isVnHolidayYmd(new Date(Date.UTC(2024, 0, 1)), holidays)).toBe(true)
  })
})

describe("leave benefits v2024-01", () => {
  it("caps contributory wage at statutory ceiling", () => {
    expect(capContributoryWageVnd202401(100_000_000)).toBe(
      VN_SOCIAL_INSURANCE_SALARY_CAP_VND_2024
    )
  })

  it("projects maternity benefit from capped wage × months", () => {
    const r = projectVnMaternityBenefitV202401({
      averageMonthlyGrossVnd: 100_000_000,
      benefitMonths: 6,
    })
    expect(r.cappedMonthlyWageVnd).toBe(VN_SOCIAL_INSURANCE_SALARY_CAP_VND_2024)
    expect(r.totalBenefitVnd).toBe(VN_SOCIAL_INSURANCE_SALARY_CAP_VND_2024 * 6)
  })

  it("estimates sick leave allowance by contribution years", () => {
    const r = estimateVnSickLeaveAllowanceV202401({
      averageDailyWageVnd: 500_000,
      sickDays: 3,
      yearsContributed: 12,
    })
    expect(r.dailyAllowanceVnd).toBe(350_000)
    expect(r.totalAllowanceVnd).toBe(1_050_000)
  })
})
