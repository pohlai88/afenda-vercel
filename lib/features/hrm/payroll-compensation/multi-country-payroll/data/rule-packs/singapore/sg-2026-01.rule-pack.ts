/**
 * Singapore composite payroll rule pack — SG-2026-01.
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
  HOLIDAYS_SG_2026_CODE,
  getSingaporeHolidaysV2026,
} from "./holidays/v2026.holidays"
import { CPF_V2026_01_CODE, computeCpfV202601 } from "./cpf/v2026-01.table"
import { SDL_V2026_01_CODE, computeSdlV202601 } from "./sdl/v2026-01.levy"
import {
  SG_EMPLOYMENT_LEAVE_TYPES_2026,
  SG_EMPLOYMENT_LEAVE_V2026_01_CODE,
} from "./employment/v2026-01.leave"

const MANIFEST = {
  epfVersion: CPF_V2026_01_CODE,
  socsoVersion: "SG-N-A",
  eisVersion: "SG-N-A",
  pcbVersion: "SG-IRAS-NO-MONTHLY-WITHHOLDING-2026-01",
  hrdfVersion: SDL_V2026_01_CODE,
  holidayVersion: HOLIDAYS_SG_2026_CODE,
  eaLeaveVersion: SG_EMPLOYMENT_LEAVE_V2026_01_CODE,
} as const

const singapore2026_01: PayrollRulePack = {
  countryCode: "SG",
  version: "SG-2026-01",
  effectiveFrom: new Date("2026-01-01"),
  effectiveTo: null,
  manifest: MANIFEST,

  computeEmployeeContributions(
    input: PayrollComputeInput
  ): ContributionResult[] {
    const cpf = computeCpfV202601(parseFloat(input.monthlyGrossWages))
    return [
      {
        code: "CPF_EE",
        employeeAmount: cpf.employeeAmount.toFixed(2),
        employerAmount: "0.00",
      },
    ]
  },

  computeEmployerContributions(
    input: PayrollComputeInput
  ): ContributionResult[] {
    const gross = parseFloat(input.monthlyGrossWages)
    const cpf = computeCpfV202601(gross)
    const sdl = computeSdlV202601(gross)
    return [
      {
        code: "CPF_ER",
        employeeAmount: "0.00",
        employerAmount: cpf.employerAmount.toFixed(2),
      },
      {
        code: "SDL_ER",
        employeeAmount: "0.00",
        employerAmount: sdl.toFixed(2),
      },
    ]
  },

  computeIncomeTax(): TaxResult {
    return { code: "IRAS_NO_MTD", amount: "0.00" }
  },

  validateProfile(profile: HrmPayrollProfileStub): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    if (profile.countryCode !== "SG") {
      issues.push({
        code: "COUNTRY_MISMATCH",
        message: `SG-2026-01 rule pack expects countryCode=SG, got ${profile.countryCode}`,
      })
    }
    if (!profile.taxIdentifierNumber?.trim()) {
      issues.push({
        code: "STATUTORY_ID_MISSING",
        message: "Singapore payroll requires a tax identifier (NRIC/FIN).",
      })
    }
    return issues
  },

  defaultLeaveTypes(): LeaveTypeSeed[] {
    return SG_EMPLOYMENT_LEAVE_TYPES_2026.map((lt) => ({
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
    return ["epf_monthly", "hrdf_monthly", "pcb_monthly"]
  },

  publicHolidays(year: number, stateCodes: string[]): HrmHolidaySeed[] {
    return getSingaporeHolidaysV2026(year, stateCodes).map((h) => ({
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
      formatVersion: "SG-2026-01",
      body: {
        generatedAt: new Date().toISOString(),
        rulePackVersion: "SG-2026-01",
        manifest: MANIFEST,
        runIds: runs.map((r) => r.id),
        status: "draft",
      },
    }
  },
}

export const singapore2026_01RulePack = singapore2026_01
