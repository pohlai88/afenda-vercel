/**
 * Golden tests — MY-2026-01 composite rule pack manifest.
 *
 * Verifies:
 *   1. Composite manifest sub-versions match the expected per-statutory codes.
 *   2. RULE_PACK_REGISTRY contains MY-2026-01 with correct ordering.
 *   3. resolveRulePack() returns the correct composite for a date in 2026.
 *   4. Cross-country isolation: unknown country codes still throw.
 */
import { describe, expect, it } from "vitest"

// Vitest runs in Node, not App Router, so we need to mock 'server-only'
// before importing modules that guard with it.
vi.mock("server-only", () => ({}))
import { vi } from "vitest"

import {
  RULE_PACK_REGISTRY,
  resolveRulePack,
} from "../../lib/features/hrm/data/payroll-rule-pack.server"
import { EPF_V2025_10_CODE } from "../../lib/features/hrm/data/rule-packs/malaysia/epf/v2025-10.table"
import { SOCSO_V2024_10_CODE } from "../../lib/features/hrm/data/rule-packs/malaysia/socso/v2024-10.table"
import { EIS_V2024_10_CODE } from "../../lib/features/hrm/data/rule-packs/malaysia/eis/v2024-10.table"
import { PCB_V2026_01_CODE } from "../../lib/features/hrm/data/rule-packs/malaysia/pcb/v2026-01.bands"
import { HOLIDAYS_2026_CODE } from "../../lib/features/hrm/data/rule-packs/malaysia/holidays/v2026.holidays"
import { EA_LEAVE_V2023_01_CODE } from "../../lib/features/hrm/data/rule-packs/malaysia/ea-leave/v2023-01.tiers"

describe("MY-2026-01 composite rule pack manifest", () => {
  describe("RULE_PACK_REGISTRY", () => {
    it("registry is not empty", () => {
      expect(RULE_PACK_REGISTRY.length).toBeGreaterThan(0)
    })

    it("contains MY-2026-01", () => {
      const my2026 = RULE_PACK_REGISTRY.find((p) => p.version === "MY-2026-01")
      expect(my2026).toBeDefined()
    })

    it("is sorted by effectiveFrom (monotonic)", () => {
      const myPacks = RULE_PACK_REGISTRY.filter((p) => p.countryCode === "MY")
      for (let i = 1; i < myPacks.length; i++) {
        expect(myPacks[i].effectiveFrom.getTime()).toBeGreaterThanOrEqual(
          myPacks[i - 1].effectiveFrom.getTime()
        )
      }
    })
  })

  describe("Manifest sub-versions", () => {
    const pack = RULE_PACK_REGISTRY.find((p) => p.version === "MY-2026-01")

    it("epfVersion matches expected code", () => {
      expect(pack?.manifest.epfVersion).toBe(EPF_V2025_10_CODE)
    })

    it("socsoVersion matches expected code", () => {
      expect(pack?.manifest.socsoVersion).toBe(SOCSO_V2024_10_CODE)
    })

    it("eisVersion matches expected code", () => {
      expect(pack?.manifest.eisVersion).toBe(EIS_V2024_10_CODE)
    })

    it("pcbVersion matches expected code", () => {
      expect(pack?.manifest.pcbVersion).toBe(PCB_V2026_01_CODE)
    })

    it("holidayVersion matches expected code", () => {
      expect(pack?.manifest.holidayVersion).toBe(HOLIDAYS_2026_CODE)
    })

    it("eaLeaveVersion matches expected code", () => {
      expect(pack?.manifest.eaLeaveVersion).toBe(EA_LEAVE_V2023_01_CODE)
    })
  })

  describe("resolveRulePack()", () => {
    it("resolves MY pack for a date in 2026", () => {
      const pack = resolveRulePack("MY", new Date("2026-06-15"))
      expect(pack.version).toBe("MY-2026-01")
      expect(pack.countryCode).toBe("MY")
    })

    it("resolves MY pack for Jan 1 2026 (boundary)", () => {
      const pack = resolveRulePack("MY", new Date("2026-01-01"))
      expect(pack.version).toBe("MY-2026-01")
    })

    it("resolves SG pack for a date in 2026", () => {
      const pack = resolveRulePack("SG", new Date("2026-06-15"))
      expect(pack.version).toBe("SG-2026-01")
      expect(pack.countryCode).toBe("SG")
    })

    it("throws for unsupported country code", () => {
      expect(() => resolveRulePack("XX", new Date("2026-06-15"))).toThrow()
    })
  })

  describe("defaultLeaveTypes()", () => {
    const pack = RULE_PACK_REGISTRY.find((p) => p.version === "MY-2026-01")!

    it("includes annual leave", () => {
      const types = pack.defaultLeaveTypes()
      expect(types.some((t) => t.code === "annual")).toBe(true)
    })

    it("includes sick, hospitalization, maternity, paternity, unpaid", () => {
      const codes = pack.defaultLeaveTypes().map((t) => t.code)
      expect(codes).toContain("sick")
      expect(codes).toContain("hospitalization")
      expect(codes).toContain("maternity")
      expect(codes).toContain("paternity")
      expect(codes).toContain("unpaid")
    })
  })

  describe("defaultStatutoryPackTypes()", () => {
    const pack = RULE_PACK_REGISTRY.find((p) => p.version === "MY-2026-01")!

    it("includes all 6 pack types", () => {
      const types = pack.defaultStatutoryPackTypes()
      expect(types).toContain("epf_monthly")
      expect(types).toContain("socso_monthly")
      expect(types).toContain("eis_monthly")
      expect(types).toContain("pcb_monthly")
      expect(types).toContain("ea_annual")
      expect(types).toContain("borang_e_annual")
    })
  })

  describe("validateProfile()", () => {
    const pack = RULE_PACK_REGISTRY.find((p) => p.version === "MY-2026-01")!

    it("passes for countryCode=MY", () => {
      const issues = pack.validateProfile({ countryCode: "MY" })
      expect(issues).toHaveLength(0)
    })

    it("returns validation issue for wrong country", () => {
      const issues = pack.validateProfile({ countryCode: "SG" })
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0].code).toBe("COUNTRY_MISMATCH")
    })
  })

  describe("buildStatutoryPack()", () => {
    const pack = RULE_PACK_REGISTRY.find((p) => p.version === "MY-2026-01")!

    it("returns a pack payload with correct format version", () => {
      const payload = pack.buildStatutoryPack("epf_monthly", [])
      expect(payload.packType).toBe("epf_monthly")
      expect(payload.formatVersion).toBe("MY-2026-01")
      expect(payload.body).toBeDefined()
    })
  })

  describe("publicHolidays()", () => {
    const pack = RULE_PACK_REGISTRY.find((p) => p.version === "MY-2026-01")!

    it("emits locale-backed nameKey for resolved 2026 dates", () => {
      const seeds = pack.publicHolidays(2026, ["MY-KUL"])
      const labour = seeds.find((s) => s.date === "2026-05-01")
      expect(labour?.nameKey).toBe("hrm.holiday.MY.2026-05-01")
    })

    it("resolves 2027 dates including Labour Day", () => {
      const seeds = pack.publicHolidays(2027, ["MY-KUL"])
      expect(seeds.map((s) => s.date)).toContain("2027-05-01")
    })

    it("throws for unsupported calendar year", () => {
      expect(() => pack.publicHolidays(2030, ["MY-KUL"])).toThrow(/2030/)
    })
  })
})
