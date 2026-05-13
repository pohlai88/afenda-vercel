import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  RULE_PACK_REGISTRY,
  resolveRulePack,
} from "../../lib/features/hrm/data/payroll-rule-pack.server"
import {
  ID_BPJS_V2026_01_CODE,
  computeIndonesiaBpjsV202601,
} from "../../lib/features/hrm/data/rule-packs/indonesia/bpjs/v2026-01.contributions"
import {
  ID_ANNUAL_LEAVE_DAYS_AFTER_TWELVE_MONTHS,
  ID_EMPLOYMENT_LEAVE_TYPES_2026,
  ID_EMPLOYMENT_LEAVE_V2026_01_CODE,
} from "../../lib/features/hrm/data/rule-packs/indonesia/employment/v2026-01.leave"
import { indonesia2026_01RulePack } from "../../lib/features/hrm/data/rule-packs/indonesia/id-2026-01.rule-pack"

function readIndonesiaSeedManifest(): Record<string, unknown> {
  const sql = readFileSync(
    join(process.cwd(), "drizzle/0027_hrm_id_rule_pack_registry_seed.sql"),
    "utf8"
  )
  const match = sql.match(/'(\{[^']+\})',\s*\n\s*now\(\)/)
  if (!match?.[1]) {
    throw new Error("Indonesia rule-pack seed manifest JSON not found")
  }
  return JSON.parse(match[1]) as Record<string, unknown>
}

describe("Indonesia ID-2026-01 rule pack", () => {
  it("exposes stable identity + manifest pins", () => {
    expect(indonesia2026_01RulePack.countryCode).toBe("ID")
    expect(indonesia2026_01RulePack.version).toBe("ID-2026-01")
    expect(indonesia2026_01RulePack.manifest).toEqual({
      epfVersion: "ID-JHT-2026-01",
      socsoVersion: ID_BPJS_V2026_01_CODE,
      eisVersion: "ID-N-A",
      pcbVersion: "ID-PPH21-DEFERRED-2026-01",
      hrdfVersion: null,
      holidayVersion: "ID-HOLIDAY-2026",
      eaLeaveVersion: ID_EMPLOYMENT_LEAVE_V2026_01_CODE,
    })
  })

  it("keeps the Drizzle registry seed manifest aligned with the TS pack", () => {
    expect(readIndonesiaSeedManifest()).toEqual(
      indonesia2026_01RulePack.manifest
    )
  })

  it("resolves from the shared rule pack registry", () => {
    expect(RULE_PACK_REGISTRY.map((pack) => pack.version)).toContain(
      "ID-2026-01"
    )
    expect(resolveRulePack("ID", new Date("2026-06-15")).version).toBe(
      "ID-2026-01"
    )
  })

  it("validates ID payroll profiles only", () => {
    expect(
      indonesia2026_01RulePack.validateProfile({ countryCode: "ID" })
    ).toEqual([])
    expect(
      indonesia2026_01RulePack.validateProfile({ countryCode: "SG" })
    ).toMatchObject([{ code: "COUNTRY_MISMATCH" }])
  })

  it("computes baseline BPJS/JHT contributions with health wage ceiling", () => {
    expect(computeIndonesiaBpjsV202601(10_000_000)).toEqual({
      jhtEmployee: 200_000,
      jhtEmployer: 370_000,
      jkkEmployer: 24_000,
      jkmEmployer: 30_000,
      healthEmployee: 100_000,
      healthEmployer: 400_000,
    })
    expect(computeIndonesiaBpjsV202601(20_000_000)).toMatchObject({
      jhtEmployee: 400_000,
      healthEmployee: 120_000,
      healthEmployer: 480_000,
    })
  })

  it("maps BPJS/JHT outputs through the composite payroll pack", () => {
    const input = {
      organizationId: "org-id",
      countryCode: "ID",
      payrollPeriodId: "period-id",
      employeeId: "employee-id",
      monthlyGrossWages: "10000000.00",
      epfMemberCategory: null,
      employeeAgeBand: null,
      socsoCategory: null,
      eisEligible: false,
      hrdfApplicable: false,
      taxResidency: null,
      monthNumber: 1,
      yearNumber: 2026,
      ytdRemuneration: null,
      ytdPcbPaid: null,
      epfEmployeeThisMonth: null,
      ytdEpfEmployee: null,
    } as const

    expect(
      indonesia2026_01RulePack.computeEmployeeContributions(input)
    ).toEqual([
      {
        code: "JHT_EE",
        employeeAmount: "200000.00",
        employerAmount: "0.00",
      },
      {
        code: "BPJS_HEALTH_EE",
        employeeAmount: "100000.00",
        employerAmount: "0.00",
      },
    ])
    expect(
      indonesia2026_01RulePack.computeEmployerContributions(input)
    ).toEqual([
      {
        code: "JHT_ER",
        employeeAmount: "0.00",
        employerAmount: "370000.00",
      },
      {
        code: "JKK_ER",
        employeeAmount: "0.00",
        employerAmount: "24000.00",
      },
      {
        code: "JKM_ER",
        employeeAmount: "0.00",
        employerAmount: "30000.00",
      },
      {
        code: "BPJS_HEALTH_ER",
        employeeAmount: "0.00",
        employerAmount: "400000.00",
      },
    ])
    expect(indonesia2026_01RulePack.computeIncomeTax(input)).toEqual({
      code: "PPH21_DEFERRED",
      amount: "0.00",
    })
  })

  it("lists national holidays and leave seeds for the 2026 baseline", () => {
    const holidays = indonesia2026_01RulePack.publicHolidays(2026, [])
    expect(holidays.map((holiday) => holiday.date)).toEqual([
      "2026-01-01",
      "2026-01-16",
      "2026-02-17",
      "2026-03-19",
      "2026-03-21",
      "2026-03-22",
      "2026-04-03",
      "2026-04-05",
      "2026-05-01",
      "2026-05-14",
      "2026-05-27",
      "2026-05-31",
      "2026-06-01",
      "2026-06-16",
      "2026-08-17",
      "2026-08-25",
      "2026-12-25",
    ])
    expect(indonesia2026_01RulePack.publicHolidays(2027, [])).toEqual([])
    expect(ID_ANNUAL_LEAVE_DAYS_AFTER_TWELVE_MONTHS).toBe(12)
    expect(indonesia2026_01RulePack.defaultLeaveTypes()).toEqual(
      ID_EMPLOYMENT_LEAVE_TYPES_2026.map((leaveType) => ({
        code: leaveType.code,
        labelKey: leaveType.labelKey,
      }))
    )
  })
})
