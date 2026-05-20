import "server-only"

import type {
  HrmPayrollProfileStub,
  PayrollComputeInput,
  PayrollRulePack,
  ValidationIssue,
} from "../../multi-country-payroll/data/payroll-rule-pack.server"
import {
  projectBenefitPayrollLinesForPeriod,
  type BenefitPayrollProjectionEnrollment,
} from "../../benefits-administration/data/benefit-payroll-projection.shared"
import type { BonusPayrollProjectionInput } from "../../bonus-incentive-management"

// ---------------------------------------------------------------------------
// Input / output contracts
// ---------------------------------------------------------------------------

/** Full inputs for one employee's payroll run. Constructed by the action
 *  from DB snapshots so the engine itself is IO-free and fully testable.
 */
export type PayrollEngineInput = {
  readonly organizationId: string
  readonly periodId: string
  readonly employeeId: string
  readonly contractId: string | null
  readonly profileId: string | null
  readonly countryCode: string
  /** Gross salary declared on the active contract (e.g. "5000.00"). */
  readonly basicSalaryAmount: string
  readonly basicSalaryCurrency: string
  /** Additional contract compensation lines snapshotted for this run. */
  readonly contractAllowances: ReadonlyArray<PayrollContractAllowanceInput>
  /** ISO date string "YYYY-MM-DD" — first day of the period. */
  readonly periodStart?: string
  /** ISO date string "YYYY-MM-DD" — last day of the period; used for rule-pack resolution. */
  readonly periodEnd: string
  /** Total approved unpaid leave deduction minutes for this period. */
  readonly unpaidLeaveMinutes: number
  /** Total working minutes in the period (schedule basis). */
  readonly scheduledMinutes: number
  /** Legacy attendance OT minutes — retained for readiness checks; earnings use `approvedOvertimeEarnings`. */
  readonly overtimeMinutes: number
  /**
   * Payroll-ready OTM rows for this employee in the period (HRM-OTM-023).
   * One earning line per request with `overtimeRequestId` for period lock settlement.
   */
  readonly approvedOvertimeEarnings?: ReadonlyArray<PayrollOvertimeEarningInput>
  // ── Statutory profile fields (from hrm_payroll_profile) ──────────────────
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
  readonly taxIdentifierNumber?: string | null
  readonly epfNumber?: string | null
  readonly socsoNumber?: string | null
  readonly payCurrency?: string | null
  readonly taxResidencyCountry?: string | null
  // ── PCB running-total fields ───────────────────────────────────────────────
  readonly monthNumber: number | null
  readonly yearNumber: number | null
  readonly ytdRemuneration: string | null
  readonly ytdPcbPaid: string | null
  readonly ytdEpfEmployee: string | null
  /**
   * Malaysia — Borang TP1-style additional relief (MYR/month), from profile
   * `statutoryProfileExtras`. Passed as fixed-2 string for digest stability.
   */
  readonly pcbTp1AdditionalReliefMonthly: string
  /**
   * Malaysia — Borang TP3-style deduction from remuneration for PCB only
   * (MYR/month), from profile extras.
   */
  readonly pcbTp3AdditionalDeductionMonthly: string
  /**
   * Phase 4 — Approved-but-not-yet-paid claims for this employee whose
   * `claimDate` falls inside `[periodStart, periodEnd]`. Pre-fetched by
   * the snapshot so the engine stays IO-free; emitted as one earning
   * line per claim with `claimId` populated so the period lock can flip
   * each linked claim to `paid` atomically.
   */
  readonly approvedUnpaidClaims: ReadonlyArray<PayrollClaimInput>
  /**
   * Approved, payroll-exported bonus and incentive payouts for this employee.
   * Emitted as earnings with `bonusPayoutId` so period lock can settle them
   * idempotently without taking over payroll finalization ownership.
   */
  readonly approvedBonusPayouts?: ReadonlyArray<BonusPayrollProjectionInput>
  /**
   * Pending salary-advance installments due on or before `periodEnd` — one
   * deduction line per installment with `salaryAdvanceInstallmentId`.
   */
  readonly approvedSalaryAdvanceInstallments: ReadonlyArray<{
    readonly id: string
    readonly advanceId: string
    readonly amount: string
    readonly currency: string
  }>
  /** Benefit enrollments whose coverage may overlap the payroll period. */
  readonly benefitEnrollments?: ReadonlyArray<BenefitPayrollProjectionEnrollment>
}

/**
 * Snapshot of one approved-unpaid claim consumed by the payroll engine.
 * `payrollLineCode` resolves to the claim type's `defaultPayrollLineCode`
 * so policy stays in `hrm_claim_type` and the engine remains pure.
 */
export type PayrollClaimInput = {
  readonly claimId: string
  readonly payrollLineCode: string
  readonly description: string
  readonly amount: string
  readonly currency: string
}

export type PayrollOvertimeEarningInput = {
  readonly overtimeRequestId: string
  readonly payrollLineCode: string
  readonly description: string
  readonly amount: string
  readonly currency: string
  readonly payableMinutes: number
}

export type PayrollContractAllowanceInput = {
  readonly componentCode: string
  readonly amount: string
  readonly currency: string
  readonly taxTreatment: string
  readonly statutoryBaseTreatment: string
}

export type PayrollLineInput = {
  readonly lineKind:
    | "earning"
    | "employee_deduction"
    | "employer_contribution"
    | "tax"
    | "adjustment"
    | "validation_issue"
  readonly code: string
  readonly description: string
  readonly amount: string
  readonly rulePackProvenance?: Record<string, unknown>
  readonly metadata?: Record<string, unknown>
  /**
   * Phase 4 — Set to the `hrm_claim.id` when this line was emitted from
   * an approved-unpaid claim. The period lock walks all lines with a
   * non-null `claimId` and flips each linked claim to `paid` in the same
   * transaction, then writes one `erp.hrm.claim.paid` audit per row.
   */
  readonly claimId?: string | null
  readonly salaryAdvanceId?: string | null
  readonly salaryAdvanceInstallmentId?: string | null
  readonly bonusPayoutId?: string | null
  readonly overtimeRequestId?: string | null
}

export type PayrollEngineResult = {
  readonly grossPay: string
  readonly netPay: string
  readonly employerCost: string
  readonly validationIssues: ValidationIssue[]
  readonly lines: PayrollLineInput[]
  /** SHA-256 of the serialised input — callers write this as inputDigest for idempotency. */
  readonly inputDigest: string
}

// ---------------------------------------------------------------------------
// SHA-256 helper (Web Crypto — available in Node 18+ and Edge)
// ---------------------------------------------------------------------------

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

/** Parse a decimal string to a numeric value (centesimal). */
function parseAmount(value: string): number {
  const n = parseFloat(value)
  return isNaN(n) ? 0 : n
}

/** Format a numeric value to a fixed-2 decimal string. */
function formatAmount(value: number): string {
  return value.toFixed(2)
}

/** Compute unpaid leave deduction as a fraction of basic salary. */
function computeUnpaidLeaveDeduction(
  basicSalaryAmount: string,
  unpaidLeaveMinutes: number,
  scheduledMinutes: number
): number {
  if (scheduledMinutes <= 0 || unpaidLeaveMinutes <= 0) return 0
  const basic = parseAmount(basicSalaryAmount)
  const deduction = (unpaidLeaveMinutes / scheduledMinutes) * basic
  return Math.min(deduction, basic)
}

// ---------------------------------------------------------------------------
// Pure engine — no DB, no next/headers
// ---------------------------------------------------------------------------

/**
 * Compute payroll lines for a single employee for a single period.
 *
 * Deterministic: same input → same output.
 * Phase 3A ships a skeleton that handles the BASIC + unpaid leave deduction
 * path and delegates statutory contributions to the rule pack when one is
 * available. Returns empty statutory lines (not validation issues) when
 * RULE_PACK_REGISTRY is still empty (pre–Phase 3B).
 *
 * @param input   Snapshot of employee data at period-end time.
 * @param pack    Optional resolved PayrollRulePack; null when registry is empty.
 */
export async function computePayrollRun(
  input: PayrollEngineInput,
  pack: PayrollRulePack | null
): Promise<PayrollEngineResult> {
  const lines: PayrollLineInput[] = []
  const validationIssues: ValidationIssue[] = []

  const provenance = pack
    ? {
        compositePack: pack.version,
        epfVersion: pack.manifest.epfVersion,
        socsoVersion: pack.manifest.socsoVersion,
        eisVersion: pack.manifest.eisVersion,
        pcbVersion: pack.manifest.pcbVersion,
        hrdfVersion: pack.manifest.hrdfVersion,
        holidayVersion: pack.manifest.holidayVersion,
        eaLeaveVersion: pack.manifest.eaLeaveVersion,
      }
    : null

  // 1. Basic salary earning
  const basicAmount = parseAmount(input.basicSalaryAmount)
  lines.push({
    lineKind: "earning",
    code: "BASIC",
    description: "Basic salary",
    amount: formatAmount(basicAmount),
    rulePackProvenance: provenance ?? undefined,
  })

  let contractAllowanceTotal = 0
  for (const allowance of input.contractAllowances) {
    const amount = parseAmount(allowance.amount)
    if (amount <= 0) continue

    if (
      allowance.currency.toUpperCase() !==
      input.basicSalaryCurrency.toUpperCase()
    ) {
      validationIssues.push({
        code: "PAYROLL_CONTRACT_ALLOWANCE_CURRENCY_MISMATCH",
        message: `Contract allowance ${allowance.componentCode} currency ${allowance.currency} does not match payroll currency ${input.basicSalaryCurrency}.`,
      })
      continue
    }

    contractAllowanceTotal += amount
    lines.push({
      lineKind: "earning",
      code: allowance.componentCode,
      description: allowance.componentCode.replace(/_/g, " "),
      amount: formatAmount(amount),
      metadata: {
        currency: allowance.currency,
        taxTreatment: allowance.taxTreatment,
        statutoryBaseTreatment: allowance.statutoryBaseTreatment,
        source: "contract_compensation_line",
      },
    })
  }

  // 2. Unpaid leave deduction
  const unpaidDeduction = computeUnpaidLeaveDeduction(
    input.basicSalaryAmount,
    input.unpaidLeaveMinutes,
    input.scheduledMinutes
  )
  if (unpaidDeduction > 0) {
    lines.push({
      lineKind: "employee_deduction",
      code: "UNPAID_LEAVE_DEDUCT",
      description: "Unpaid leave deduction",
      amount: formatAmount(-unpaidDeduction),
      metadata: {
        unpaidLeaveMinutes: input.unpaidLeaveMinutes,
        scheduledMinutes: input.scheduledMinutes,
      },
    })
  }

  // 2b. Approved-unpaid claim earnings (Phase 4) — one earning line per
  // claim, with `claimId` populated so the period lock can flip each
  // linked claim to `paid` atomically. Emitted before statutory pass so
  // the additional earning is part of `grossPay`.
  let claimsTotal = 0
  for (const claim of input.approvedUnpaidClaims ?? []) {
    const amount = parseAmount(claim.amount)
    if (amount <= 0) continue
    claimsTotal += amount
    lines.push({
      lineKind: "earning",
      code: claim.payrollLineCode,
      description: claim.description,
      amount: formatAmount(amount),
      claimId: claim.claimId,
      metadata: {
        currency: claim.currency,
        sourceClaimId: claim.claimId,
      },
    })
  }

  let overtimeEarningTotal = 0
  for (const ot of input.approvedOvertimeEarnings ?? []) {
    const amount = parseAmount(ot.amount)
    if (amount <= 0) continue
    overtimeEarningTotal += amount
    lines.push({
      lineKind: "earning",
      code: ot.payrollLineCode,
      description: ot.description,
      amount: formatAmount(amount),
      overtimeRequestId: ot.overtimeRequestId,
      metadata: {
        currency: ot.currency,
        payableMinutes: ot.payableMinutes,
        source: "hrm_overtime_request",
        sourceOvertimeRequestId: ot.overtimeRequestId,
      },
    })
  }

  let bonusPayoutTotal = 0
  for (const payout of input.approvedBonusPayouts ?? []) {
    const amount = parseAmount(payout.amount)
    if (amount <= 0) continue
    bonusPayoutTotal += amount
    lines.push({
      lineKind: "earning",
      code: payout.payrollLineCode,
      description: payout.description,
      amount: formatAmount(amount),
      bonusPayoutId: payout.payoutId,
      metadata: {
        currency: payout.currency,
        source: "bonus_incentive_payout",
        sourceBonusPayoutId: payout.payoutId,
      },
    })
  }

  // 3. Gross pay = BASIC + contract allowances + claim/bonus earnings (before deductions)
  const grossPay =
    basicAmount +
    contractAllowanceTotal +
    claimsTotal +
    bonusPayoutTotal +
    overtimeEarningTotal
  const grossPayFormatted = formatAmount(grossPay)

  // 4. Statutory contributions via rule pack
  if (pack) {
    const baseRulePackInput: PayrollComputeInput = {
      organizationId: input.organizationId,
      countryCode: input.countryCode,
      payrollPeriodId: input.periodId,
      employeeId: input.employeeId,
      monthlyGrossWages: formatAmount(grossPay),
      epfMemberCategory: input.epfMemberCategory,
      employeeAgeBand: input.employeeAgeBand,
      socsoCategory: input.socsoCategory,
      eisEligible: input.eisEligible,
      hrdfApplicable: input.hrdfApplicable,
      taxResidency: input.taxResidency,
      monthNumber: input.monthNumber,
      yearNumber: input.yearNumber,
      ytdRemuneration: input.ytdRemuneration,
      ytdPcbPaid: input.ytdPcbPaid,
      epfEmployeeThisMonth: "0.00",
      ytdEpfEmployee: input.ytdEpfEmployee,
      pcbTp1AdditionalReliefMonthly: input.pcbTp1AdditionalReliefMonthly,
      pcbTp3AdditionalDeductionMonthly: input.pcbTp3AdditionalDeductionMonthly,
    }

    try {
      const profileStub: HrmPayrollProfileStub = {
        countryCode: input.countryCode,
        taxIdentifierNumber: input.taxIdentifierNumber ?? null,
        epfNumber: input.epfNumber ?? null,
        socsoNumber: input.socsoNumber ?? null,
        payCurrency: input.payCurrency ?? null,
        taxResidencyCountry: input.taxResidencyCountry ?? null,
      }
      const profileIssues = pack.validateProfile(profileStub)
      validationIssues.push(...profileIssues)

      if (profileIssues.length === 0) {
        const eeCont = pack.computeEmployeeContributions(baseRulePackInput)
        const epfEmployeeThisMonth = eeCont
          .filter((c) => c.code === "EPF_EE")
          .reduce((sum, c) => sum + parseAmount(c.employeeAmount), 0)
        const rulePackInput: PayrollComputeInput = {
          ...baseRulePackInput,
          epfEmployeeThisMonth: formatAmount(epfEmployeeThisMonth),
          pcbTp1AdditionalReliefMonthly: input.pcbTp1AdditionalReliefMonthly,
          pcbTp3AdditionalDeductionMonthly:
            input.pcbTp3AdditionalDeductionMonthly,
        }

        for (const c of eeCont) {
          const eeAmt = parseAmount(c.employeeAmount)
          if (eeAmt === 0) continue
          lines.push({
            lineKind: "employee_deduction",
            code: c.code,
            description: c.code.replace(/_/g, " "),
            amount: formatAmount(-eeAmt),
            rulePackProvenance: provenance ?? undefined,
          })
        }

        const erCont = pack.computeEmployerContributions(rulePackInput)
        for (const c of erCont) {
          const erAmt = parseAmount(c.employerAmount)
          if (erAmt === 0) continue
          lines.push({
            lineKind: "employer_contribution",
            code: c.code,
            description: c.code.replace(/_/g, " "),
            amount: formatAmount(erAmt),
            rulePackProvenance: provenance ?? undefined,
          })
        }

        const tax = pack.computeIncomeTax(rulePackInput)
        if (parseAmount(tax.amount) > 0) {
          lines.push({
            lineKind: "tax",
            code: tax.code,
            description: "Income tax (PCB/MTD)",
            amount: formatAmount(-parseAmount(tax.amount)),
            rulePackProvenance: provenance ?? undefined,
          })
        }
      }
    } catch {
      validationIssues.push({
        code: "RULE_PACK_ERROR",
        message: "Rule pack computation failed — see system logs.",
      })
    }
  }

  for (const installment of input.approvedSalaryAdvanceInstallments ?? []) {
    const amt = parseAmount(installment.amount)
    if (amt <= 0) continue
    lines.push({
      lineKind: "employee_deduction",
      code: "SALARY_ADVANCE_REPAY",
      description: "Salary advance repayment",
      amount: formatAmount(-amt),
      salaryAdvanceId: installment.advanceId,
      salaryAdvanceInstallmentId: installment.id,
      metadata: {
        salaryAdvanceId: installment.advanceId,
        salaryAdvanceInstallmentId: installment.id,
        currency: installment.currency,
      },
    })
  }

  const benefitLines = projectBenefitPayrollLinesForPeriod({
    enrollments: input.benefitEnrollments ?? [],
    periodStart: input.periodStart ?? input.periodEnd,
    periodEnd: input.periodEnd,
    currency: input.basicSalaryCurrency,
  })
  lines.push(...benefitLines)

  // 5. Net pay = BASIC + earnings + employee deductions only (employer_contribution excluded)
  const netPay = lines
    .filter((l) => l.lineKind !== "employer_contribution")
    .reduce((sum, l) => sum + parseAmount(l.amount), 0)

  // 6. Employer cost = gross + employer contributions
  const employerCost =
    grossPay +
    lines
      .filter((l) => l.lineKind === "employer_contribution")
      .reduce((sum, l) => sum + parseAmount(l.amount), 0)

  // 7. Input digest for idempotency
  const inputDigest = await sha256Hex(JSON.stringify(input))

  return {
    grossPay: grossPayFormatted,
    netPay: formatAmount(netPay),
    employerCost: formatAmount(employerCost),
    validationIssues,
    lines,
    inputDigest,
  }
}

// ---------------------------------------------------------------------------
// Payroll period traceability (the 7 questions answered at preview time)
// ---------------------------------------------------------------------------

/** The eight traceability signals that any payroll preview must surface.
 *  Evaluated from run + line data without touching the rule pack again.
 */
export type PayrollPeriodTraceability = {
  /** Q1 — employees included in this period's runs. */
  readonly employeeCount: number
  /** Q2 — whether every run has a contract snapshot. */
  readonly allContractsSnapshotted: boolean
  /** Q3 — whether every run has a profile snapshot. */
  readonly allProfilesSnapshotted: boolean
  /** Q4 — whether attendance is complete (no employees with open attendance days in window). */
  readonly attendanceComplete: boolean
  /** Q5 — composite rule pack version pinned on the period. */
  readonly rulePackVersion: string | null
  /** Q6 — number of runs with validation issues. */
  readonly runsWithBlockers: number
  /** Q7 — whether a payroll-finalize approval exists for this period. */
  readonly approvalExists: boolean
  /**
   * Q8 — Phase 4: count of approved-but-not-yet-paid claims that fall
   * inside this period's date window, organization-scoped (counts every
   * employee). Surfaces on the payroll console so admins can see how
   * many claims will be settled by the next lock without leaving the
   * page.
   */
  readonly approvedUnpaidClaimCount: number
  /** Approved AP claims awaiting treasury (informational; does not block lock). */
  readonly approvedUnpaidApClaimCount: number
}

/** Derive traceability signals from already-loaded data.
 *  Pure function — no DB calls.
 */
export function derivePayrollTraceability(params: {
  runs: Array<{
    contractId: string | null
    profileId: string | null
    validationIssues: Array<{ code: string; message: string }>
  }>
  attendanceComplete: boolean
  rulePackVersion: string | null
  approvalExists: boolean
  approvedUnpaidClaimCount: number
  approvedUnpaidApClaimCount: number
}): PayrollPeriodTraceability {
  return {
    employeeCount: params.runs.length,
    allContractsSnapshotted: params.runs.every((r) => r.contractId !== null),
    allProfilesSnapshotted: params.runs.every((r) => r.profileId !== null),
    attendanceComplete: params.attendanceComplete,
    rulePackVersion: params.rulePackVersion,
    runsWithBlockers: params.runs.filter((r) => r.validationIssues.length > 0)
      .length,
    approvalExists: params.approvalExists,
    approvedUnpaidClaimCount: params.approvedUnpaidClaimCount,
    approvedUnpaidApClaimCount: params.approvedUnpaidApClaimCount,
  }
}
