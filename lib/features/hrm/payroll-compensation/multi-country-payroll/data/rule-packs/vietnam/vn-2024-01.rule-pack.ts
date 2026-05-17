/**
 * Vietnam composite payroll rule pack — VN-2024-01.
 *
 * Social insurance contribution ceiling: 20 × regional minimum wage (Region I
 * baseline encoded here — update in a new composite when MLW changes).
 *
 * Effective from: 2024-01-01
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
import { computeVnPitMonthlyV202401 } from "./pit/v2024-01.monthly"
import {
  HOLIDAYS_VN_2024_CODE,
  getVietnamHolidaysV2024,
} from "./holidays/v2024.holidays"
import { buildVnInsuranceMonthlyReportXmlV202401 } from "./vn-bhxh-report-xml.shared"
import {
  VN_EMPLOYMENT_LEAVE_TYPES_2024,
  VN_EMPLOYMENT_LEAVE_V2024_01_CODE,
} from "./employment/v2024-01.leave"

/** Region I monthly minimum wage (VND) — illustrative baseline for SI/HI cap. */
const VN_REGIONAL_MIN_WAGE_VND = 4_960_000
const VN_SI_SALARY_CAP_VND = 20 * VN_REGIONAL_MIN_WAGE_VND

const RATE_BHXH_EE = 0.08
const RATE_BHXH_ER = 0.175
const RATE_BHYT_EE = 0.015
const RATE_BHYT_ER = 0.03
const RATE_BHTN_EE = 0.01
const RATE_BHTN_ER = 0.01

const MANIFEST = {
  epfVersion: "VN-BHXH-2024-01",
  socsoVersion: "VN-BHYT-BHTN-2024-01",
  eisVersion: "VN-N-A",
  pcbVersion: "VN-PIT-2024-01",
  hrdfVersion: null,
  holidayVersion: HOLIDAYS_VN_2024_CODE,
  eaLeaveVersion: VN_EMPLOYMENT_LEAVE_V2024_01_CODE,
} as const

function parseGross(input: PayrollComputeInput): number {
  const n = parseFloat(input.monthlyGrossWages)
  return Number.isFinite(n) ? n : 0
}

function insuranceSalaryVnd(
  gross: number,
  payCurrency: string | null | undefined
): number {
  const cur = (payCurrency ?? "").toUpperCase()
  if (cur !== "VND") {
    // Without VND payroll currency we cannot apply VN statutory caps safely.
    return gross
  }
  return Math.min(Math.max(gross, 0), VN_SI_SALARY_CAP_VND)
}

function computeInsuranceAmounts(input: PayrollComputeInput): {
  readonly base: number
  readonly bhxhEe: number
  readonly bhxhEr: number
  readonly bhytEe: number
  readonly bhytEr: number
  readonly bhtnEe: number
  readonly bhtnEr: number
} {
  const gross = parseGross(input)
  const base = insuranceSalaryVnd(gross, input.payCurrency)
  return {
    base,
    bhxhEe: base * RATE_BHXH_EE,
    bhxhEr: base * RATE_BHXH_ER,
    bhytEe: base * RATE_BHYT_EE,
    bhytEr: base * RATE_BHYT_ER,
    bhtnEe: base * RATE_BHTN_EE,
    bhtnEr: base * RATE_BHTN_ER,
  }
}

const vietnam2024_01: PayrollRulePack = {
  countryCode: "VN",
  version: "VN-2024-01",
  effectiveFrom: new Date("2024-01-01"),
  effectiveTo: null,
  manifest: MANIFEST,

  computeEmployeeContributions(
    input: PayrollComputeInput
  ): ContributionResult[] {
    const x = computeInsuranceAmounts(input)
    return [
      {
        code: "VN_BHXH_EE",
        employeeAmount: x.bhxhEe.toFixed(2),
        employerAmount: "0.00",
      },
      {
        code: "VN_BHYT_EE",
        employeeAmount: x.bhytEe.toFixed(2),
        employerAmount: "0.00",
      },
      {
        code: "VN_BHTN_EE",
        employeeAmount: x.bhtnEe.toFixed(2),
        employerAmount: "0.00",
      },
    ]
  },

  computeEmployerContributions(
    input: PayrollComputeInput
  ): ContributionResult[] {
    const x = computeInsuranceAmounts(input)
    return [
      {
        code: "VN_BHXH_ER",
        employeeAmount: "0.00",
        employerAmount: x.bhxhEr.toFixed(2),
      },
      {
        code: "VN_BHYT_ER",
        employeeAmount: "0.00",
        employerAmount: x.bhytEr.toFixed(2),
      },
      {
        code: "VN_BHTN_ER",
        employeeAmount: "0.00",
        employerAmount: x.bhtnEr.toFixed(2),
      },
    ]
  },

  computeIncomeTax(input: PayrollComputeInput): TaxResult {
    const cur = (input.payCurrency ?? "").toUpperCase()
    if (cur !== "VND") {
      return { code: "VN_PIT", amount: "0.00" }
    }
    const gross = parseGross(input)
    const ins = computeInsuranceAmounts(input)
    const eeTotal = ins.bhxhEe + ins.bhytEe + ins.bhtnEe
    const pit = computeVnPitMonthlyV202401({
      grossVnd: gross,
      employeeInsuranceVnd: eeTotal,
      taxDependentCount: input.taxDependentCount ?? 0,
    })
    return { code: "VN_PIT", amount: pit.pit.toFixed(2) }
  },

  validateProfile(profile: HrmPayrollProfileStub): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    if (profile.countryCode !== "VN") {
      issues.push({
        code: "COUNTRY_MISMATCH",
        message: `VN-2024-01 rule pack expects countryCode=VN, got ${profile.countryCode}`,
      })
    }
    if (!profile.taxIdentifierNumber?.trim()) {
      issues.push({
        code: "STATUTORY_ID_MISSING",
        message: "Vietnam payroll requires a tax identifier (MST).",
      })
    }
    return issues
  },

  defaultLeaveTypes(): LeaveTypeSeed[] {
    return VN_EMPLOYMENT_LEAVE_TYPES_2024.map((lt) => ({
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
    return [...getVietnamHolidaysV2024(year, provinceCodes)]
  },

  buildStatutoryPack(
    packType: StatutoryPackType,
    runs: readonly { readonly id: string }[]
  ): StatutoryPackPayload {
    const baseBody = {
      generatedAt: new Date().toISOString(),
      rulePackVersion: "VN-2024-01",
      manifest: MANIFEST,
      runIds: runs.map((r) => r.id),
      status: "draft",
    } as const

    if (packType === "epf_monthly") {
      return {
        packType: "epf_monthly",
        formatVersion: MANIFEST.epfVersion,
        body: {
          ...baseBody,
          insuranceReportXml: buildVnInsuranceMonthlyReportXmlV202401({
            companyName: "",
            taxCode: "",
            reportPeriodYm: "unknown",
            reportDate: new Date(),
            employees: [],
          }),
        },
      }
    }

    return {
      packType,
      formatVersion: "VN-2024-01",
      body: { ...baseBody },
    }
  },
}

export const vietnam2024_01RulePack = vietnam2024_01
