import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { RULE_PACK_REGISTRY } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server.ts"

import { CPF_V2026_01_CODE } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/singapore/cpf/v2026-01.table.ts"
import {
  SG_EMPLOYMENT_LEAVE_TYPES_2026,
  SG_EMPLOYMENT_LEAVE_V2026_01_CODE,
  SG_HOSPITALIZATION_LEAVE_DAYS,
  SG_OUTPATIENT_SICK_LEAVE_DAYS,
} from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/singapore/employment/v2026-01.leave.ts"
import { singapore2026_01RulePack } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/singapore/sg-2026-01.rule-pack.ts"
import { SDL_V2026_01_CODE } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/singapore/sdl/v2026-01.levy.ts"

function readSingaporeSeedManifest(): Record<string, unknown> {
  const sql = readFileSync(
    join(process.cwd(), "drizzle/0026_hrm_sg_rule_pack_registry_seed.sql"),
    "utf8"
  )
  const match = sql.match(/'(\{[^']+\})',\s*\n\s*now\(\)/)
  if (!match?.[1]) {
    throw new Error("Singapore rule-pack seed manifest JSON not found")
  }
  return JSON.parse(match[1]) as Record<string, unknown>
}

describe("Singapore SG-2026-01 rule pack", () => {
  it("exposes stable identity + manifest pins", () => {
    expect(singapore2026_01RulePack.countryCode).toBe("SG")
    expect(singapore2026_01RulePack.version).toBe("SG-2026-01")
    expect(singapore2026_01RulePack.manifest.epfVersion).toBe(CPF_V2026_01_CODE)
    expect(singapore2026_01RulePack.manifest.hrdfVersion).toBe(
      SDL_V2026_01_CODE
    )
    expect(singapore2026_01RulePack.manifest.holidayVersion).toBe(
      "SG-HOLIDAY-2026"
    )
    expect(singapore2026_01RulePack.manifest.pcbVersion).toBe(
      "SG-IRAS-NO-MONTHLY-WITHHOLDING-2026-01"
    )
    expect(singapore2026_01RulePack.manifest.eaLeaveVersion).toBe(
      SG_EMPLOYMENT_LEAVE_V2026_01_CODE
    )
  })

  it("keeps the Drizzle registry seed manifest aligned with the TS pack", () => {
    const seedPath = join(
      process.cwd(),
      "drizzle/0026_hrm_sg_rule_pack_registry_seed.sql"
    )
    if (!existsSync(seedPath)) {
      expect(
        RULE_PACK_REGISTRY.find((p) => p.version === "SG-2026-01")?.manifest
      ).toEqual(singapore2026_01RulePack.manifest)
      return
    }
    expect(readSingaporeSeedManifest()).toEqual(
      singapore2026_01RulePack.manifest
    )
  })

  it("validates SG payroll profiles only", () => {
    expect(
      singapore2026_01RulePack.validateProfile({
        countryCode: "SG",
        taxIdentifierNumber: "S1234567A",
      })
    ).toEqual([])
    expect(
      singapore2026_01RulePack.validateProfile({
        countryCode: "MY",
        taxIdentifierNumber: "S1234567A",
      })
    ).toMatchObject([{ code: "COUNTRY_MISMATCH" }])
  })

  it("lists 2026 public holidays for SG pack", () => {
    const holidays = singapore2026_01RulePack.publicHolidays(2026, [])
    expect(holidays.map((h) => h.date)).toEqual([
      "2026-01-01",
      "2026-02-17",
      "2026-02-18",
      "2026-03-21",
      "2026-04-03",
      "2026-05-01",
      "2026-05-27",
      "2026-05-31",
      "2026-08-09",
      "2026-11-08",
      "2026-12-25",
    ])
    expect(new Set(holidays.map((h) => h.nameKey)).size).toBe(holidays.length)
  })

  it("does not list SG holidays outside the pinned year", () => {
    expect(singapore2026_01RulePack.publicHolidays(2027, [])).toEqual([])
  })

  it("exposes SG Employment Act leave seed types through the composite pack", () => {
    expect(SG_OUTPATIENT_SICK_LEAVE_DAYS).toBe(14)
    expect(SG_HOSPITALIZATION_LEAVE_DAYS).toBe(60)
    expect(SG_EMPLOYMENT_LEAVE_TYPES_2026.map((lt) => lt.code)).toEqual([
      "ANNUAL",
      "OUTPATIENT_SICK",
      "HOSPITALIZATION",
    ])
    expect(singapore2026_01RulePack.defaultLeaveTypes()).toEqual(
      SG_EMPLOYMENT_LEAVE_TYPES_2026.map((lt) => ({
        code: lt.code,
        labelKey: lt.labelKey,
      }))
    )
  })
})
