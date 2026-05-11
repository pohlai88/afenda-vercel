import "server-only"

/**
 * Per-statutory versioned tables — each has its own effective period (Malaysia:
 * EPF, SOCSO, PCB, etc.). Phase 0 exports types only; country implementations
 * land in Phase 3B.
 */
export type StatutoryRuleVersion<TData> = {
  readonly code: string
  readonly effectiveFrom: Date
  readonly effectiveTo: Date | null
  readonly data: TData
}

/** Payroll compute context — expanded when the payroll engine ships (Phase 3). */
export type PayrollComputeInput = {
  readonly organizationId: string
  readonly countryCode: string
  readonly payrollPeriodId: string
  readonly employeeId: string
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
}

/**
 * Composite payroll rule pack manifest — pinned onto payroll periods at lock time.
 * Implementations live under `data/rule-packs/<country>/` (Phase 3B).
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

/** Registered packs — empty until Malaysia `MY-2026-01` ships (Phase 3B). */
export const RULE_PACK_REGISTRY: readonly PayrollRulePack[] = []

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
