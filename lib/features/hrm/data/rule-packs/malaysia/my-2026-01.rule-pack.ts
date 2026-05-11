/**
 * Malaysia composite payroll rule pack — MY-2026-01.
 *
 * Effective from: 2026-01-01
 * Effective to:   null (current)
 *
 * Sub-versions pinned by this composite:
 *   epfVersion:     MY-EPF-2025-10   (KWSP Third Schedule, Oct 2025)
 *   socsoVersion:   MY-SOCSO-2024-10 (PERKESO RM6,000 ceiling, Oct 2024)
 *   eisVersion:     MY-EIS-2024-10   (PERKESO EIS, Oct 2024)
 *   pcbVersion:     MY-PCB-2026-01   (LHDN MTD 2026 spec)
 *   hrdfVersion:    MY-HRDF-2024-01  (HRD Corp levy)
 *   holidayVersion: MY-HOLIDAY-2026  (Federal + state holidays 2026)
 *   eaLeaveVersion: MY-EA-2023-01    (EA 1955 amended Jan 2023)
 *
 * This file is append-only. Shipping new regulator changes creates a new
 * composite manifest (e.g. my-2026-04.rule-pack.ts). Never mutate this file.
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
  type EpfEmployeeCategory,
  EPF_V2025_10_CODE,
  computeEpfV202510,
} from "./epf/v2025-10.table"
import {
  SOCSO_V2024_10_CODE,
  computeSocsoV202410,
} from "./socso/v2024-10.table"
import { EIS_V2024_10_CODE, computeEisV202410 } from "./eis/v2024-10.table"
import { PCB_V2026_01_CODE, computePcbV202601 } from "./pcb/v2026-01.bands"
import { HOLIDAYS_2026_CODE, getHolidaysV2026 } from "./holidays/v2026.holidays"
import {
  EA_LEAVE_V2023_01_CODE,
  EA_LEAVE_TYPES_2023,
} from "./ea-leave/v2023-01.tiers"

const MANIFEST = {
  epfVersion: EPF_V2025_10_CODE,
  socsoVersion: SOCSO_V2024_10_CODE,
  eisVersion: EIS_V2024_10_CODE,
  pcbVersion: PCB_V2026_01_CODE,
  hrdfVersion: "MY-HRDF-2024-01" as const,
  holidayVersion: HOLIDAYS_2026_CODE,
  eaLeaveVersion: EA_LEAVE_V2023_01_CODE,
} as const

function toEpfCategory(input: PayrollComputeInput): EpfEmployeeCategory {
  if (input.epfMemberCategory) return input.epfMemberCategory
  return input.employeeAgeBand === "60to74"
    ? "MY_PR_60PLUS"
    : input.employeeAgeBand === "above74"
      ? "MY_PR_ABOVE75"
      : "MY_PR_BELOW60"
}

const malaysia2026_01: PayrollRulePack = {
  countryCode: "MY",
  version: "MY-2026-01",
  effectiveFrom: new Date("2026-01-01"),
  effectiveTo: null,
  manifest: MANIFEST,

  computeEmployeeContributions(
    input: PayrollComputeInput
  ): ContributionResult[] {
    const gross = parseFloat(input.monthlyGrossWages)
    const results: ContributionResult[] = []

    // EPF (Employee)
    const epfCat = toEpfCategory(input)
    const epf = computeEpfV202510(gross, epfCat)
    results.push({
      code: "EPF_EE",
      employeeAmount: epf.employeeAmount.toFixed(2),
      employerAmount: "0.00",
    })

    // SOCSO (Employee — Category 1 only)
    const socsoCategory = input.socsoCategory ?? 1
    if (socsoCategory === 1) {
      const socso = computeSocsoV202410(gross, 1)
      results.push({
        code: "SOCSO_EE",
        employeeAmount: socso.employeeAmount.toFixed(2),
        employerAmount: "0.00",
      })
    }

    // EIS (Employee)
    if (input.eisEligible) {
      const eis = computeEisV202410(gross, true)
      results.push({
        code: "EIS_EE",
        employeeAmount: eis.employeeAmount.toFixed(2),
        employerAmount: "0.00",
      })
    }

    return results
  },

  computeEmployerContributions(
    input: PayrollComputeInput
  ): ContributionResult[] {
    const gross = parseFloat(input.monthlyGrossWages)
    const results: ContributionResult[] = []

    // EPF (Employer)
    const epfCat = toEpfCategory(input)
    const epf = computeEpfV202510(gross, epfCat)
    results.push({
      code: "EPF_ER",
      employeeAmount: "0.00",
      employerAmount: epf.employerAmount.toFixed(2),
    })

    // SOCSO (Employer — both Cat 1 and Cat 2)
    const socsoCategory = input.socsoCategory ?? 1
    const socso = computeSocsoV202410(gross, socsoCategory)
    results.push({
      code: "SOCSO_ER",
      employeeAmount: "0.00",
      employerAmount: socso.employerAmount.toFixed(2),
    })

    // EIS (Employer)
    if (input.eisEligible) {
      const eis = computeEisV202410(gross, true)
      results.push({
        code: "EIS_ER",
        employeeAmount: "0.00",
        employerAmount: eis.employerAmount.toFixed(2),
      })
    }

    // HRDF (Employer, if applicable)
    if (input.hrdfApplicable) {
      const hrdf = gross * 0.01
      results.push({
        code: "HRDF",
        employeeAmount: "0.00",
        employerAmount: hrdf.toFixed(2),
      })
    }

    return results
  },

  computeIncomeTax(input: PayrollComputeInput): TaxResult {
    const gross = parseFloat(input.monthlyGrossWages)
    const epfEmployee = parseFloat(input.epfEmployeeThisMonth ?? "0")
    const ytdEpf = parseFloat(input.ytdEpfEmployee ?? "0")

    const pcb = computePcbV202601({
      monthlyGross: gross,
      residency: input.taxResidency ?? "resident",
      month: input.monthNumber ?? 1,
      year: input.yearNumber ?? 2026,
      ytdRemuneration: parseFloat(input.ytdRemuneration ?? "0"),
      ytdPcbPaid: parseFloat(input.ytdPcbPaid ?? "0"),
      epfEmployeeThisMonth: epfEmployee,
      ytdEpfEmployee: ytdEpf,
    })

    return {
      code: "PCB",
      amount: pcb.toFixed(2),
    }
  },

  validateProfile(profile: HrmPayrollProfileStub): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    if (profile.countryCode !== "MY") {
      issues.push({
        code: "COUNTRY_MISMATCH",
        message: `MY-2026-01 rule pack expects countryCode=MY, got ${profile.countryCode}`,
      })
    }
    return issues
  },

  defaultLeaveTypes(): LeaveTypeSeed[] {
    return EA_LEAVE_TYPES_2023.map((lt) => ({
      code: lt.code,
      labelKey: `hrm.leaveType.${lt.code}`,
    }))
  },

  defaultClaimTypes(): ClaimTypeSeed[] {
    return [
      { code: "medical", labelKey: "hrm.claimType.medical" },
      { code: "travel", labelKey: "hrm.claimType.travel" },
      { code: "meal", labelKey: "hrm.claimType.meal" },
      { code: "equipment", labelKey: "hrm.claimType.equipment" },
    ]
  },

  defaultStatutoryPackTypes(): StatutoryPackType[] {
    return [
      "epf_monthly",
      "socso_monthly",
      "eis_monthly",
      "pcb_monthly",
      "ea_annual",
      "borang_e_annual",
    ]
  },

  publicHolidays(year: number, stateCodes: string[]): HrmHolidaySeed[] {
    const dates = getHolidaysV2026(year, stateCodes)
    return dates.map((date) => ({
      date,
      nameKey: `hrm.holiday.MY.${date}`,
      stateCodes,
    }))
  },

  buildStatutoryPack(
    packType: StatutoryPackType,
    runs: readonly { readonly id: string }[]
  ): StatutoryPackPayload {
    return {
      packType,
      formatVersion: "MY-2026-01",
      body: {
        generatedAt: new Date().toISOString(),
        rulePackVersion: "MY-2026-01",
        manifest: MANIFEST,
        runIds: runs.map((r) => r.id),
        status: "draft",
      },
    }
  },
}

export const malaysia2026_01RulePack = malaysia2026_01
