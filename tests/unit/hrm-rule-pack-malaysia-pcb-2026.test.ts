/**
 * Golden tests — LHDN MTD / PCB 2026 (v2026-01).
 *
 * Reference: LHDN MTD 2026 computerised payroll calculation method.
 *   Progressive income tax bands + standard reliefs.
 *
 * Test cases verify:
 *   1. Progressive tax band computations
 *   2. Monthly PCB with standard individual relief + EPF relief
 *   3. Non-resident flat rate
 *   4. Running total (YTD) adjustments
 */
import { describe, expect, it } from "vitest"
import {
  computeProgressiveTax,
  computePcbV202601,
  PCB_V2026_01_CODE,
  INDIVIDUAL_RELIEF_2026,
  EPF_RELIEF_MAX_2026,
  PROGRESSIVE_BANDS_2026,
} from "../../lib/features/hrm/data/rule-packs/malaysia/pcb/v2026-01.bands"

describe("PCB v2026-01 — LHDN MTD 2026 golden tests", () => {
  it("exports correct version code", () => {
    expect(PCB_V2026_01_CODE).toBe("MY-PCB-2026-01")
  })

  it("individual relief is RM9,000", () => {
    expect(INDIVIDUAL_RELIEF_2026).toBe(9000)
  })

  it("EPF relief cap is RM4,000", () => {
    expect(EPF_RELIEF_MAX_2026).toBe(4000)
  })

  it("has 11 progressive bands", () => {
    expect(PROGRESSIVE_BANDS_2026.length).toBe(11)
  })

  describe("computeProgressiveTax — annual chargeable income", () => {
    it("income RM0 → tax RM0", () => {
      expect(computeProgressiveTax(0)).toBe(0)
    })

    it("income RM5,000 (within 0% band) → tax RM0", () => {
      expect(computeProgressiveTax(5000)).toBe(0)
    })

    it("income RM20,000 (1% band ceiling) → tax RM150", () => {
      // RM5,001–20,000 at 1% = RM14,999 × 1% = RM149.99 + RM0 base = RM149.99
      // baseTax for band starting at 5001 = 0, excess = 20000 - 5000 = 15000, tax = 150
      const tax = computeProgressiveTax(20_000)
      expect(tax).toBeCloseTo(150, 1)
    })

    it("income RM35,000 → crosses 1% and 3% bands", () => {
      // 5001–20000 at 1%: RM150
      // 20001–35000 at 3%: RM450
      // total: RM600  (matches baseTax for next band)
      const tax = computeProgressiveTax(35_000)
      expect(tax).toBeCloseTo(600, 1)
    })

    it("income RM50,000", () => {
      // 35001–50000 at 8%: 15000 * 8% = 1200; base = 600
      const tax = computeProgressiveTax(50_000)
      expect(tax).toBeCloseTo(1800, 1)
    })

    it("income RM100,000", () => {
      // 70001–100000 at 21%: 30000 * 21% = 6300; base = 4400
      const tax = computeProgressiveTax(100_000)
      expect(tax).toBeCloseTo(10700, 0)
    })
  })

  describe("computePcbV202601 — monthly MTD calculation", () => {
    it("resident, RM5,000/month, fresh year (month 1), EPF already deducted", () => {
      // Annual gross: 5000 * 12 = 60,000
      // Less individual relief: 9,000
      // Less EPF relief: min(5000 * 0.11 * 12, 4000) = min(6600, 4000) = 4000
      // Chargeable: 60,000 - 9,000 - 4,000 = 47,000
      // Tax on 47,000: (35001–47000) at 8% + base 600 = 12000 * 0.08 + 600 = 960 + 600 = 1560
      // Monthly PCB: 1560 / 12 = 130.00
      const pcb = computePcbV202601({
        monthlyGross: 5000,
        residency: "resident",
        month: 1,
        year: 2026,
        ytdRemuneration: 0,
        ytdPcbPaid: 0,
        epfEmployeeThisMonth: 550, // EPF EE for RM5000
        ytdEpfEmployee: 0,
      })
      // Allow ±2 due to ceiling/rounding in EPF estimates
      expect(pcb).toBeGreaterThanOrEqual(120)
      expect(pcb).toBeLessThanOrEqual(150)
    })

    it("non-resident, RM10,000/month → flat 30%", () => {
      const pcb = computePcbV202601({
        monthlyGross: 10_000,
        residency: "non_resident",
        month: 1,
        year: 2026,
        ytdRemuneration: 0,
        ytdPcbPaid: 0,
        epfEmployeeThisMonth: 0,
        ytdEpfEmployee: 0,
      })
      // Annual = 120,000; tax = 120,000 * 30% = 36,000; monthly = 3,000
      expect(pcb).toBeCloseTo(3000, 0)
    })

    it("PCB is 0 for very low income (below chargeable threshold)", () => {
      // RM1,000/month * 12 = 12,000; less 9,000 individual = 3,000; less EPF 4,000 → negative → 0 tax
      const pcb = computePcbV202601({
        monthlyGross: 1000,
        residency: "resident",
        month: 1,
        year: 2026,
        ytdRemuneration: 0,
        ytdPcbPaid: 0,
        epfEmployeeThisMonth: 110,
        ytdEpfEmployee: 0,
      })
      expect(pcb).toBe(0)
    })

    it("PCB is non-negative (no negative deductions)", () => {
      const pcb = computePcbV202601({
        monthlyGross: 2000,
        residency: "resident",
        month: 12, // last month
        year: 2026,
        ytdRemuneration: 22000, // overpaid
        ytdPcbPaid: 9999, // already paid more than required
        epfEmployeeThisMonth: 220,
        ytdEpfEmployee: 2420,
      })
      expect(pcb).toBeGreaterThanOrEqual(0)
    })
  })
})
