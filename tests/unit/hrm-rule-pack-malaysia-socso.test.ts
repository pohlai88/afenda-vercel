/**
 * Golden tests — PERKESO SOCSO Contribution Schedule (v2024-10).
 *
 * Reference: PERKESO — effective 1 October 2024.
 *   Wage ceiling: RM6,000 (increased from RM5,000).
 *   Category 1: Employee 0.5% + Employer 1.75%
 *   Category 2: Employer 1.25% only
 */
import { describe, expect, it } from "vitest"
import {
  computeSocsoV202410,
  SOCSO_V2024_10_CODE,
  SOCSO_WAGE_CEILING_2024_10,
} from "../../lib/features/hrm/data/rule-packs/malaysia/socso/v2024-10.table"

describe("SOCSO v2024-10 — PERKESO golden tests", () => {
  it("exports correct version code", () => {
    expect(SOCSO_V2024_10_CODE).toBe("MY-SOCSO-2024-10")
  })

  it("exports correct wage ceiling RM6,000", () => {
    expect(SOCSO_WAGE_CEILING_2024_10).toBe(6000)
  })

  describe("Category 1 — employee + employer contributions", () => {
    it("wages RM5,000 → employee RM25.00, employer RM87.50", () => {
      const result = computeSocsoV202410(5000, 1)
      expect(result.employeeAmount).toBe(25.0) // 5000 * 0.005
      expect(result.employerAmount).toBe(87.5) // 5000 * 0.0175
    })

    it("wages RM6,000 (ceiling) → employee RM30.00, employer RM105.00", () => {
      const result = computeSocsoV202410(6000, 1)
      expect(result.employeeAmount).toBe(30.0)
      expect(result.employerAmount).toBe(105.0)
    })

    it("wages above ceiling (RM7,000) — capped at RM6,000", () => {
      const result = computeSocsoV202410(7000, 1)
      expect(result.employeeAmount).toBe(30.0)
      expect(result.employerAmount).toBe(105.0)
    })

    it("wages RM10,000 — still capped at RM6,000", () => {
      const result = computeSocsoV202410(10_000, 1)
      expect(result.employeeAmount).toBe(30.0)
      expect(result.employerAmount).toBe(105.0)
    })

    it("wages RM3,000", () => {
      const result = computeSocsoV202410(3000, 1)
      expect(result.employeeAmount).toBe(15.0) // 3000 * 0.005
      expect(result.employerAmount).toBe(52.5) // 3000 * 0.0175
    })
  })

  describe("Category 2 — employer only", () => {
    it("wages RM5,000 → employee RM0, employer RM62.50", () => {
      const result = computeSocsoV202410(5000, 2)
      expect(result.employeeAmount).toBe(0)
      expect(result.employerAmount).toBe(62.5) // 5000 * 0.0125
    })

    it("wages RM6,000 (ceiling) → employer RM75.00", () => {
      const result = computeSocsoV202410(6000, 2)
      expect(result.employerAmount).toBe(75.0)
    })

    it("wages RM8,000 — capped at ceiling", () => {
      const result = computeSocsoV202410(8000, 2)
      expect(result.employerAmount).toBe(75.0)
    })
  })

  describe("Edge cases", () => {
    it("zero wages → zero contributions", () => {
      const result = computeSocsoV202410(0, 1)
      expect(result.employeeAmount).toBe(0)
      expect(result.employerAmount).toBe(0)
    })
  })
})
