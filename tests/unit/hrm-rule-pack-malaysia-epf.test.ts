/**
 * Golden tests — KWSP EPF Third Schedule (v2025-10).
 *
 * Reference: KWSP Third Schedule, effective October 2025.
 * These test cases verify that our EPF computation produces the same
 * contribution amounts as the published KWSP tables.
 *
 * Rule: contributions including cents are rounded to the next higher ringgit.
 */
import { describe, expect, it } from "vitest"
import {
  computeEpfV202510,
  EPF_V2025_10_CODE,
} from "../../lib/features/hrm/data/rule-packs/malaysia/epf/v2025-10.table"

describe("EPF v2025-10 — KWSP Third Schedule golden tests", () => {
  it("exports the correct version code", () => {
    expect(EPF_V2025_10_CODE).toBe("MY-EPF-2025-10")
  })

  describe("Malaysian/PR employee below 60", () => {
    it("wages RM5,000 → employee RM550, employer RM650 (13%)", () => {
      const result = computeEpfV202510(5000, "MY_PR_BELOW60")
      expect(result.employeeAmount).toBe(550) // ceil(5000 * 0.11)
      expect(result.employerAmount).toBe(650) // ceil(5000 * 0.13)
    })

    it("wages RM5,001 → employer rate switches to 12%", () => {
      const result = computeEpfV202510(5001, "MY_PR_BELOW60")
      expect(result.employeeAmount).toBe(551) // ceil(5001 * 0.11) = ceil(550.11) = 551
      expect(result.employerAmount).toBe(601) // ceil(5001 * 0.12) = ceil(600.12) = 601
    })

    it("wages RM3,000 → employee RM330, employer RM390", () => {
      const result = computeEpfV202510(3000, "MY_PR_BELOW60")
      expect(result.employeeAmount).toBe(330)
      expect(result.employerAmount).toBe(390)
    })

    it("wages RM10,000 → employer 12% applies", () => {
      const result = computeEpfV202510(10_000, "MY_PR_BELOW60")
      expect(result.employeeAmount).toBe(1100) // ceil(10000 * 0.11)
      expect(result.employerAmount).toBe(1200) // ceil(10000 * 0.12)
    })

    it("wages with fractional ringgit — ceiling applied", () => {
      // RM4,850 × 11% = RM533.50 → ceil → RM534
      const result = computeEpfV202510(4850, "MY_PR_BELOW60")
      expect(result.employeeAmount).toBe(534) // ceil(533.50)
      expect(result.employerAmount).toBe(631) // ceil(4850 * 0.13) = ceil(630.50) = 631
    })

    it("wages RM1,500 exact percentages", () => {
      const result = computeEpfV202510(1500, "MY_PR_BELOW60")
      expect(result.employeeAmount).toBe(165) // 1500 * 0.11 = 165.00
      expect(result.employerAmount).toBe(195) // 1500 * 0.13 = 195.00
    })
  })

  describe("Malaysian/PR employee age 60+", () => {
    it("wages RM5,000 → employee 5.5%, employer 6.5%", () => {
      const result = computeEpfV202510(5000, "MY_PR_60PLUS")
      expect(result.employeeAmount).toBe(275) // ceil(5000 * 0.055)
      expect(result.employerAmount).toBe(325) // ceil(5000 * 0.065)
    })

    it("wages RM6,000 → employer switches to 6%", () => {
      const result = computeEpfV202510(6000, "MY_PR_60PLUS")
      expect(result.employeeAmount).toBe(330) // ceil(6000 * 0.055) = 330
      expect(result.employerAmount).toBe(360) // ceil(6000 * 0.06) = 360
    })
  })

  describe("Above 75 / foreigner — no contributions", () => {
    it("MY_PR_ABOVE75 returns zero", () => {
      const result = computeEpfV202510(5000, "MY_PR_ABOVE75")
      expect(result.employeeAmount).toBe(0)
      expect(result.employerAmount).toBe(0)
    })

    it("FOREIGNER returns zero", () => {
      const result = computeEpfV202510(8000, "FOREIGNER")
      expect(result.employeeAmount).toBe(0)
      expect(result.employerAmount).toBe(0)
    })
  })

  describe("Edge cases", () => {
    it("zero wages → zero contributions", () => {
      const result = computeEpfV202510(0, "MY_PR_BELOW60")
      expect(result.employeeAmount).toBe(0)
      expect(result.employerAmount).toBe(0)
    })

    it("negative wages → zero contributions", () => {
      const result = computeEpfV202510(-100, "MY_PR_BELOW60")
      expect(result.employeeAmount).toBe(0)
      expect(result.employerAmount).toBe(0)
    })
  })
})
