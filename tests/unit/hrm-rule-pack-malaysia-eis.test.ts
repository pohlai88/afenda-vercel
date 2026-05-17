/**
 * Golden tests — PERKESO EIS Schedule (v2024-10).
 *
 * Reference: PERKESO EIS Act 800; effective 1 October 2024.
 *   Rate: 0.4% total (0.2% employee + 0.2% employer)
 *   Wage ceiling: RM6,000
 */
import { describe, expect, it } from "vitest"
import {
  computeEisV202410,
  EIS_V2024_10_CODE,
  EIS_WAGE_CEILING_2024_10,
  EIS_RATE_EACH,
} from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/malaysia/eis/v2024-10.table.ts"

describe("EIS v2024-10 — PERKESO golden tests", () => {
  it("exports correct version code", () => {
    expect(EIS_V2024_10_CODE).toBe("MY-EIS-2024-10")
  })

  it("exports correct wage ceiling RM6,000", () => {
    expect(EIS_WAGE_CEILING_2024_10).toBe(6000)
  })

  it("exports correct rate 0.2% each side", () => {
    expect(EIS_RATE_EACH).toBe(0.002)
  })

  describe("Eligible employee contributions", () => {
    it("wages RM5,000 → employee RM10.00, employer RM10.00", () => {
      const result = computeEisV202410(5000, true)
      expect(result.employeeAmount).toBe(10.0) // 5000 * 0.002
      expect(result.employerAmount).toBe(10.0)
    })

    it("wages RM6,000 (ceiling) → employee RM12.00, employer RM12.00", () => {
      const result = computeEisV202410(6000, true)
      expect(result.employeeAmount).toBe(12.0)
      expect(result.employerAmount).toBe(12.0)
    })

    it("wages RM7,000 — capped at RM6,000 ceiling", () => {
      const result = computeEisV202410(7000, true)
      expect(result.employeeAmount).toBe(12.0)
      expect(result.employerAmount).toBe(12.0)
    })

    it("wages RM3,000", () => {
      const result = computeEisV202410(3000, true)
      expect(result.employeeAmount).toBe(6.0)
      expect(result.employerAmount).toBe(6.0)
    })

    it("wages RM1,500", () => {
      const result = computeEisV202410(1500, true)
      expect(result.employeeAmount).toBe(3.0)
      expect(result.employerAmount).toBe(3.0)
    })
  })

  describe("Ineligible employee", () => {
    it("eligible=false → zero contributions regardless of wages", () => {
      const result = computeEisV202410(8000, false)
      expect(result.employeeAmount).toBe(0)
      expect(result.employerAmount).toBe(0)
    })
  })

  describe("Edge cases", () => {
    it("zero wages → zero contributions", () => {
      const result = computeEisV202410(0, true)
      expect(result.employeeAmount).toBe(0)
      expect(result.employerAmount).toBe(0)
    })
  })
})
