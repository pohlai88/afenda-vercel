import "server-only"

import { indonesia2026_01RulePack } from "./rule-packs/indonesia/id-2026-01.rule-pack"
import { malaysia2026_01RulePack } from "./rule-packs/malaysia/my-2026-01.rule-pack"
import { singapore2026_01RulePack } from "./rule-packs/singapore/sg-2026-01.rule-pack"
import { vietnam2024_01RulePack } from "./rule-packs/vietnam/vn-2024-01.rule-pack"

/**
 * Per-statutory versioned tables — each has its own effective period (Malaysia:
 * EPF, SOCSO, PCB, etc.).
 */
export type StatutoryRuleVersion<TData> = {
  readonly code: string
  readonly effectiveFrom: Date
  readonly effectiveTo: Date | null
  readonly data: TData
}

/**
 * Full payroll compute context passed from the engine to the rule pack.
 * The engine constructs this from DB snapshots so each field has a
 * well-defined source of truth.
 */
export type PayrollComputeInput = {
  readonly organizationId: string
  readonly countryCode: string
  readonly payrollPeriodId: string
  readonly employeeId: string
  readonly monthlyGrossWages: string
  readonly epfMemberCategory:
    | "MY_PR_BELOW60"
    | "MY_PR_60PLUS"
    | "MY_PR_ABOVE75"
    | "FOREIGNER"
    | null
  readonly employeeAgeBand: "below60" | "60to74" | "above74" | null
  readonly socsoCategory: 1 | 2 | null
  readonly eisEligible: boolean
  readonly hrdfApplicable: boolean
  readonly taxResidency: "resident" | "non_resident" | null
  readonly monthNumber: number | null
  readonly yearNumber: number | null
  readonly ytdRemuneration: string | null
  readonly ytdPcbPaid: string | null
  readonly epfEmployeeThisMonth: string | null
  readonly ytdEpfEmployee: string | null
  readonly pcbTp1AdditionalReliefMonthly?: string | null
  readonly pcbTp3AdditionalDeductionMonthly?: string | null
  readonly payCurrency?: string | null
  readonly taxDependentCount?: number | null
}

export type ContributionResult = {
  readonly code: string
  readonly employeeAmount: string
  readonly employerAmount: string
}

export type TaxResult = {
  readonly code: string
  readonly amount: string
}

export type ValidationIssue = {
  readonly code: string
  readonly message: string
}

export type LeaveTypeSeed = {
  readonly code: string
  readonly labelKey: string
}

export type ClaimTypeSeed = {
  readonly code: string
  readonly labelKey: string
}

export type StatutoryPackType =
  | "epf_monthly"
  | "socso_monthly"
  | "eis_monthly"
  | "pcb_monthly"
  | "hrdf_monthly"
  | "ea_annual"
  | "borang_e_annual"

export type HrmHolidaySeed = {
  readonly date: string
  readonly nameKey: string
  readonly stateCodes: readonly string[]
}

export type StatutoryPackPayload = {
  readonly packType: StatutoryPackType
  readonly formatVersion: string
  readonly body: Record<string, unknown>
}

export type HrmPayrollProfileStub = {
  readonly countryCode: string
  readonly taxIdentifierNumber?: string | null
  readonly epfNumber?: string | null
  readonly socsoNumber?: string | null
  readonly payCurrency?: string | null
  readonly taxResidencyCountry?: string | null
}

/**
 * Composite payroll rule pack manifest — pinned onto payroll periods at lock time.
 * Implementations live under `data/rule-packs/<country>/`. HRM-MCP-001/023/024.
 */
export interface PayrollRulePack {
  readonly countryCode: "MY" | "SG" | "ID" | "TH" | "VN" | "PH"
  readonly version: string
  readonly effectiveFrom: Date
  readonly effectiveTo: Date | null
  readonly manifest: {
    readonly epfVersion: string
    readonly socsoVersion: string
    readonly eisVersion: string
    readonly pcbVersion: string
    readonly hrdfVersion: string | null
    readonly holidayVersion: string
    readonly eaLeaveVersion: string
  }

  computeEmployeeContributions(input: PayrollComputeInput): ContributionResult[]
  computeEmployerContributions(input: PayrollComputeInput): ContributionResult[]
  computeIncomeTax(input: PayrollComputeInput): TaxResult
  validateProfile(profile: HrmPayrollProfileStub): ValidationIssue[]

  defaultLeaveTypes(): LeaveTypeSeed[]
  defaultClaimTypes(): ClaimTypeSeed[]
  defaultStatutoryPackTypes(): StatutoryPackType[]
  publicHolidays(year: number, stateCodes: string[]): HrmHolidaySeed[]

  buildStatutoryPack(
    packType: StatutoryPackType,
    runs: readonly { readonly id: string }[]
  ): StatutoryPackPayload
}

/** Registered country rule packs (HRM-MCP-001). */
export const RULE_PACK_REGISTRY: readonly PayrollRulePack[] = [
  indonesia2026_01RulePack,
  malaysia2026_01RulePack,
  singapore2026_01RulePack,
  vietnam2024_01RulePack,
]

export function resolveRulePack(
  countryCode: string,
  atDate: Date
): PayrollRulePack {
  const candidate = RULE_PACK_REGISTRY.filter(
    (pack) => pack.countryCode === countryCode
  )
    .filter(
      (pack) =>
        pack.effectiveFrom <= atDate &&
        (pack.effectiveTo === null || pack.effectiveTo > atDate)
    )
    .at(-1)

  if (!candidate) {
    throw new Error(
      `No PayrollRulePack for ${countryCode} at ${atDate.toISOString()}`
    )
  }

  return candidate
}

export function listSupportedPayrollCountryCodes(): readonly string[] {
  const codes = new Set<string>()
  for (const pack of RULE_PACK_REGISTRY) {
    codes.add(pack.countryCode)
  }
  return [...codes].sort()
}
