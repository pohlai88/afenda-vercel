import "server-only"

import { indonesia2026_01RulePack } from "./rule-packs/indonesia/id-2026-01.rule-pack"
import { malaysia2026_01RulePack } from "./rule-packs/malaysia/my-2026-01.rule-pack"
import { singapore2026_01RulePack } from "./rule-packs/singapore/sg-2026-01.rule-pack"

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
  // ── Identity ────────────────────────────────────────────────────────────
  readonly organizationId: string
  readonly countryCode: string
  readonly payrollPeriodId: string
  readonly employeeId: string

  // ── Wage basis ───────────────────────────────────────────────────────────
  /** Gross monthly wages for this period, e.g. "5000.00" (MYR). */
  readonly monthlyGrossWages: string

  // ── EPF ──────────────────────────────────────────────────────────────────
  /**
   * EPF membership category.
   * MY_PR_BELOW60  — Malaysian/PR, age < 60 (11% EE / 13 or 12% ER)
   * MY_PR_60PLUS   — Malaysian/PR, age 60–74 (5.5% / 6.5 or 6%)
   * MY_PR_ABOVE75  — Malaysian/PR, age ≥ 75 (no contribution)
   * FOREIGNER      — Non-citizen (no statutory EPF)
   * null           — derive from employeeAgeBand (fallback)
   */
  readonly epfMemberCategory:
    | "MY_PR_BELOW60"
    | "MY_PR_60PLUS"
    | "MY_PR_ABOVE75"
    | "FOREIGNER"
    | null

  /** Age band fallback when epfMemberCategory is null. */
  readonly employeeAgeBand: "below60" | "60to74" | "above74" | null

  // ── SOCSO ─────────────────────────────────────────────────────────────────
  /**
   * SOCSO contribution category.
   * 1 — First Category: employee < 60 (EE 0.5% + ER 1.75%)
   * 2 — Second Category: employer only (ER 1.25%)
   * null — default to 1 for new registrations
   */
  readonly socsoCategory: 1 | 2 | null

  // ── EIS ───────────────────────────────────────────────────────────────────
  /** Whether the employee is eligible for EIS (Malaysian/PR only). */
  readonly eisEligible: boolean

  // ── HRDF ─────────────────────────────────────────────────────────────────
  /**
   * Whether the employer levy (HRDF/HRD Corp) applies to this employee.
   * Controlled by org-level payroll profile field `hrdfApplicable`.
   */
  readonly hrdfApplicable: boolean

  // ── PCB / MTD (income tax) ───────────────────────────────────────────────
  /**
   * Tax residency for PCB calculation.
   * "resident"    — standard progressive rates + reliefs
   * "non_resident" — flat 30% on gross
   * null — default to "resident"
   */
  readonly taxResidency: "resident" | "non_resident" | null

  /** Calendar month number 1–12 (for MTD running-total method). */
  readonly monthNumber: number | null

  /** Calendar year 4-digit (for MTD bands). */
  readonly yearNumber: number | null

  /**
   * Year-to-date gross remuneration received before this month (MYR string).
   * Used for cumulative MTD calculation.
   */
  readonly ytdRemuneration: string | null

  /**
   * Year-to-date PCB already deducted before this month (MYR string).
   * Used so re-runs produce consistent monthly amounts.
   */
  readonly ytdPcbPaid: string | null

  /**
   * EPF employee contribution for this month (MYR string).
   * Used as EPF relief input to PCB calculation.
   */
  readonly epfEmployeeThisMonth: string | null

  /**
   * Accumulated EPF employee contributions paid before this month this year
   * (MYR string). Combined with this month for annual EPF relief cap.
   */
  readonly ytdEpfEmployee: string | null

  /**
   * Malaysia only — Borang TP1-style additional relief (MYR/month), persisted on
   * `hrm_payroll_profile.statutoryProfileExtras`. Omitted treated as zero.
   */
  readonly pcbTp1AdditionalReliefMonthly?: string | null

  /**
   * Malaysia only — Borang TP3-style additional deduction from remuneration for
   * PCB projection (MYR/month). Omitted treated as zero.
   */
  readonly pcbTp3AdditionalDeductionMonthly?: string | null
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
}

/**
 * Composite payroll rule pack manifest — pinned onto payroll periods at lock time.
 * Implementations live under `data/rule-packs/<country>/`.
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

/** Registered packs — Malaysia baseline + Phase 5 SEA country packs. */
export const RULE_PACK_REGISTRY: readonly PayrollRulePack[] = [
  indonesia2026_01RulePack,
  malaysia2026_01RulePack,
  singapore2026_01RulePack,
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
