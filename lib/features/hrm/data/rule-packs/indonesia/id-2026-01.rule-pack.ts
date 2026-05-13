/**
 * Indonesia composite payroll rule pack — ID-2026-01.
 *
 * Effective from: 2026-01-01
 */

import type {
  ClaimTypeSeed,
  ContributionResult,
  HrmHolidaySeed,
  HrmPayrollProfileStub,
  LeaveTypeSeed,
  PayrollComputeInput,
  PayrollRulePack,
  StatutoryPackPayload,
  StatutoryPackType,
  TaxResult,
  ValidationIssue,
} from "../../payroll-rule-pack.server"
import {
  HOLIDAYS_ID_2026_CODE,
  getIndonesiaHolidaysV2026,
} from "./holidays/v2026.holidays"
import {
  ID_BPJS_V2026_01_CODE,
  computeIndonesiaBpjsV202601,
} from "./bpjs/v2026-01.contributions"
import {
  ID_EMPLOYMENT_LEAVE_TYPES_2026,
  ID_EMPLOYMENT_LEAVE_V2026_01_CODE,
} from "./employment/v2026-01.leave"

const MANIFEST = {
  epfVersion: "ID-JHT-2026-01",
  socsoVersion: ID_BPJS_V2026_01_CODE,
  eisVersion: "ID-N-A",
  pcbVersion: "ID-PPH21-DEFERRED-2026-01",
  hrdfVersion: null,
  holidayVersion: HOLIDAYS_ID_2026_CODE,
  eaLeaveVersion: ID_EMPLOYMENT_LEAVE_V2026_01_CODE,
} as const

const indonesia2026_01: PayrollRulePack = {
  countryCode: "ID",
  version: "ID-2026-01",
  effectiveFrom: new Date("2026-01-01"),
  effectiveTo: null,
  manifest: MANIFEST,

  computeEmployeeContributions(
    input: PayrollComputeInput
  ): ContributionResult[] {
    const bpjs = computeIndonesiaBpjsV202601(
      parseFloat(input.monthlyGrossWages)
    )
    return [
      {
        code: "JHT_EE",
        employeeAmount: bpjs.jhtEmployee.toFixed(2),
        employerAmount: "0.00",
      },
      {
        code: "BPJS_HEALTH_EE",
        employeeAmount: bpjs.healthEmployee.toFixed(2),
        employerAmount: "0.00",
      },
    ]
  },

  computeEmployerContributions(
    input: PayrollComputeInput
  ): ContributionResult[] {
    const bpjs = computeIndonesiaBpjsV202601(
      parseFloat(input.monthlyGrossWages)
    )
    return [
      {
        code: "JHT_ER",
        employeeAmount: "0.00",
        employerAmount: bpjs.jhtEmployer.toFixed(2),
      },
      {
        code: "JKK_ER",
        employeeAmount: "0.00",
        employerAmount: bpjs.jkkEmployer.toFixed(2),
      },
      {
        code: "JKM_ER",
        employeeAmount: "0.00",
        employerAmount: bpjs.jkmEmployer.toFixed(2),
      },
      {
        code: "BPJS_HEALTH_ER",
        employeeAmount: "0.00",
        employerAmount: bpjs.healthEmployer.toFixed(2),
      },
    ]
  },

  computeIncomeTax(): TaxResult {
    return { code: "PPH21_DEFERRED", amount: "0.00" }
  },

  validateProfile(profile: HrmPayrollProfileStub): ValidationIssue[] {
    if (profile.countryCode === "ID") return []
    return [
      {
        code: "COUNTRY_MISMATCH",
        message: `ID-2026-01 rule pack expects countryCode=ID, got ${profile.countryCode}`,
      },
    ]
  },

  defaultLeaveTypes(): LeaveTypeSeed[] {
    return ID_EMPLOYMENT_LEAVE_TYPES_2026.map((lt) => ({
      code: lt.code,
      labelKey: lt.labelKey,
    }))
  },

  defaultClaimTypes(): ClaimTypeSeed[] {
    return [
      { code: "medical", labelKey: "hrm.claimType.medical" },
      { code: "travel", labelKey: "hrm.claimType.travel" },
    ]
  },

  defaultStatutoryPackTypes(): StatutoryPackType[] {
    return ["epf_monthly", "socso_monthly", "pcb_monthly"]
  },

  publicHolidays(year: number, provinceCodes: string[]): HrmHolidaySeed[] {
    return getIndonesiaHolidaysV2026(year, provinceCodes).map((h) => ({
      date: h.date,
      nameKey: h.nameKey,
      stateCodes: [],
    }))
  },

  buildStatutoryPack(
    packType: StatutoryPackType,
    runs: readonly { readonly id: string }[]
  ): StatutoryPackPayload {
    return {
      packType,
      formatVersion: "ID-2026-01",
      body: {
        generatedAt: new Date().toISOString(),
        rulePackVersion: "ID-2026-01",
        manifest: MANIFEST,
        runIds: runs.map((r) => r.id),
        status: "draft",
      },
    }
  },
}

export const indonesia2026_01RulePack = indonesia2026_01
