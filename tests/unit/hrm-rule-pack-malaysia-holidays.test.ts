/**
 * Golden tests — Malaysia Public Holidays 2026 (holidays/v2026).
 *
 * Verifies:
 *   - Federal holidays are included for all states
 *   - State-specific holidays appear only for the correct states
 *   - Holiday date count assertions by state type
 */
import { describe, expect, it } from "vitest"
import {
  getHolidaysV2026,
  countHolidaysV2026,
  HOLIDAYS_2026_CODE,
  MALAYSIA_HOLIDAYS_2026,
} from "../../lib/features/hrm/data/rule-packs/malaysia/holidays/v2026.holidays"

describe("Malaysia Holidays 2026 — golden tests", () => {
  it("exports correct version code", () => {
    expect(HOLIDAYS_2026_CODE).toBe("MY-HOLIDAY-2026")
  })

  it("calendar has at least 15 entries", () => {
    expect(MALAYSIA_HOLIDAYS_2026.length).toBeGreaterThanOrEqual(15)
  })

  describe("Federal holidays (all states)", () => {
    const federalHolidays = MALAYSIA_HOLIDAYS_2026.filter(
      (h) => h.stateCodes.length === 0
    )

    it("has at least 10 federal holidays", () => {
      expect(federalHolidays.length).toBeGreaterThanOrEqual(10)
    })

    it("includes Labour Day (2026-05-01)", () => {
      const dates = getHolidaysV2026(2026, ["MY-KUL"])
      expect(dates).toContain("2026-05-01")
    })

    it("includes National Day (2026-08-31)", () => {
      const dates = getHolidaysV2026(2026, ["MY-SGR"])
      expect(dates).toContain("2026-08-31")
    })

    it("includes Malaysia Day (2026-09-16)", () => {
      const dates = getHolidaysV2026(2026, ["MY-JHR"])
      expect(dates).toContain("2026-09-16")
    })

    it("includes Christmas (2026-12-25)", () => {
      const dates = getHolidaysV2026(2026, ["MY-SBH"])
      expect(dates).toContain("2026-12-25")
    })

    it("includes Chinese New Year Day 1 (2026-01-29)", () => {
      const dates = getHolidaysV2026(2026, ["MY-PRK"])
      expect(dates).toContain("2026-01-29")
    })

    it("includes Agong's Birthday (2026-06-01)", () => {
      const dates = getHolidaysV2026(2026, ["MY-MLK"])
      expect(dates).toContain("2026-06-01")
    })
  })

  describe("State-specific holidays", () => {
    it("Federal Territory Day (2026-02-01) applies to KUL only", () => {
      const kulDates = getHolidaysV2026(2026, ["MY-KUL"])
      const jhrDates = getHolidaysV2026(2026, ["MY-JHR"])
      expect(kulDates).toContain("2026-02-01")
      expect(jhrDates).not.toContain("2026-02-01")
    })

    it("KUL has more holidays than Johor (FT Day)", () => {
      const kulCount = countHolidaysV2026(["MY-KUL"])
      const jhrCount = countHolidaysV2026(["MY-JHR"])
      expect(kulCount).toBeGreaterThan(jhrCount)
    })

    it("Selangor has Sultan's birthday not present in Sabah", () => {
      const sgrDates = getHolidaysV2026(2026, ["MY-SGR"])
      const sbhDates = getHolidaysV2026(2026, ["MY-SBH"])
      // Selangor has Sultan birthday on Jul 7
      expect(sgrDates).toContain("2026-07-07")
      expect(sbhDates).not.toContain("2026-07-07")
    })
  })

  describe("Year guard", () => {
    it("throws for year != 2026", () => {
      expect(() => getHolidaysV2026(2025, ["MY-KUL"])).toThrow()
      expect(() => getHolidaysV2026(2027, ["MY-KUL"])).toThrow()
    })
  })

  describe("No duplicate dates for a given state", () => {
    it("KUL dates are all unique", () => {
      const dates = getHolidaysV2026(2026, ["MY-KUL"])
      const unique = new Set(dates)
      expect(unique.size).toBe(dates.length)
    })
  })
})
