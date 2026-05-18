import "server-only"

import { and, eq, inArray, ne } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmClaim } from "#lib/db/schema"
import { resolveExchangeRate } from "../../multi-country-payroll/server"

import {
  evaluateClaimEligibility,
  parseClaimEligibilityRules,
  type ClaimEligibilitySnapshot,
} from "./claim-eligibility.shared"
import {
  evaluateClaimPolicyLimits,
  parseClaimPolicyRules,
  type ClaimValidationFlag,
} from "./claim-policy.shared"
import {
  hasBlockingDuplicateSignals,
  mergeClaimDuplicateSignals,
  scoreDuplicateClaims,
  type ClaimDuplicateSignalDraft,
} from "./claim-duplicate.shared"
import { listReceiptPayloadDuplicateSignalsForSubmit } from "./claim-evidence-validation.server"
import { buildClaimFxSnapshot, type ClaimFxSnapshot } from "./claim-fx.shared"
import type { ExpenseFundRow } from "./expense-fund.queries.server"
import { sumClaimsForEmployeeClaimTypeWindow } from "./claim.queries.server"

export type ClaimSubmissionEvaluation = {
  readonly eligibilitySnapshot: ClaimEligibilitySnapshot
  readonly validationFlags: readonly ClaimValidationFlag[]
  readonly requiresExceptionApproval: boolean
  readonly duplicateSignals: readonly ClaimDuplicateSignalDraft[]
  readonly duplicateReviewStatus: "clear" | "flagged"
  readonly fxSnapshot: ClaimFxSnapshot | null
  readonly reimbursementCurrency: string
  readonly reimbursementMode: string
}

async function sumClaimsForEmployeeOnDate(input: {
  organizationId: string
  employeeId: string
  claimTypeId: string
  claimDate: string
}): Promise<number> {
  const rows = await db
    .select({ amount: hrmClaim.amount })
    .from(hrmClaim)
    .where(
      and(
        eq(hrmClaim.organizationId, input.organizationId),
        eq(hrmClaim.employeeId, input.employeeId),
        eq(hrmClaim.claimTypeId, input.claimTypeId),
        eq(hrmClaim.claimDate, input.claimDate),
        inArray(hrmClaim.state, ["submitted", "approved", "paid"])
      )
    )
  return rows.reduce((total, row) => total + Number(row.amount), 0)
}

async function listRecentClaimsForDuplicateScan(input: {
  organizationId: string
  employeeId: string
  claimDate: string
  excludeClaimId?: string
}): Promise<
  readonly {
    id: string
    claimNumber: string | null
    employeeId: string
    claimDate: string
    amount: string
    currency: string
    state: string
  }[]
> {
  const rows = await db
    .select({
      id: hrmClaim.id,
      claimNumber: hrmClaim.claimNumber,
      employeeId: hrmClaim.employeeId,
      claimDate: hrmClaim.claimDate,
      amount: hrmClaim.amount,
      currency: hrmClaim.currency,
      state: hrmClaim.state,
    })
    .from(hrmClaim)
    .where(
      and(
        eq(hrmClaim.organizationId, input.organizationId),
        eq(hrmClaim.employeeId, input.employeeId),
        eq(hrmClaim.claimDate, input.claimDate),
        inArray(hrmClaim.state, ["submitted", "approved", "paid", "returned"]),
        input.excludeClaimId ? ne(hrmClaim.id, input.excludeClaimId) : undefined
      )
    )
    .limit(20)

  return rows
}

function claimMonthWindow(claimDate: string): {
  claimDateFrom: string
  claimDateTo: string
} {
  const year = Number(claimDate.slice(0, 4))
  const month = Number(claimDate.slice(5, 7))
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthText = String(month).padStart(2, "0")
  return {
    claimDateFrom: `${year}-${monthText}-01`,
    claimDateTo: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
  }
}

function claimYearWindow(claimDate: string): {
  claimDateFrom: string
  claimDateTo: string
} {
  const year = claimDate.slice(0, 4)
  return { claimDateFrom: `${year}-01-01`, claimDateTo: `${year}-12-31` }
}

export async function evaluateClaimSubmission(input: {
  organizationId: string
  employee: {
    id: string
    archivedAt: Date | null
    employmentStatus: string | null
    employmentType: string | null
    countryCode: string | null
    legalEntityCode: string | null
    currentDepartmentId: string | null
    currentJobGradeId: string | null
    workStateCode: string | null
  }
  claimType: {
    id: string
    code: string
    currency: string
    perClaimLimit: number | null
    periodLimit: number | null
    annualLimit: number | null
    defaultPayoutMethod: string
  }
  expenseFund: ExpenseFundRow | null
  claimDate: string
  amount: number
  claimCurrency: string
  claimNumber: string | null
  receiptPayloadHashes?: readonly string[]
  today: string
  evaluatedAt: Date
  excludeClaimId?: string
}): Promise<ClaimSubmissionEvaluation> {
  const fundRules = input.expenseFund
    ? parseClaimEligibilityRules(input.expenseFund.eligibilityRules)
    : null
  const fundPolicy = input.expenseFund
    ? parseClaimPolicyRules(input.expenseFund.policyRules)
    : null

  const eligibilitySnapshot = evaluateClaimEligibility({
    employee: input.employee,
    claimTypeCode: input.claimType.code,
    rules: fundRules,
    evaluatedAt: input.evaluatedAt,
  })

  const monthWindow = claimMonthWindow(input.claimDate)
  const yearWindow = claimYearWindow(input.claimDate)
  const [dailyTotalBefore, monthlyTotalBefore, annualTotalBefore] =
    await Promise.all([
      sumClaimsForEmployeeOnDate({
        organizationId: input.organizationId,
        employeeId: input.employee.id,
        claimTypeId: input.claimType.id,
        claimDate: input.claimDate,
      }),
      sumClaimsForEmployeeClaimTypeWindow({
        organizationId: input.organizationId,
        employeeId: input.employee.id,
        claimTypeId: input.claimType.id,
        ...monthWindow,
      }),
      sumClaimsForEmployeeClaimTypeWindow({
        organizationId: input.organizationId,
        employeeId: input.employee.id,
        claimTypeId: input.claimType.id,
        ...yearWindow,
      }),
    ])

  const policyEvaluation = evaluateClaimPolicyLimits({
    amount: input.amount,
    claimDate: input.claimDate,
    today: input.today,
    perClaimLimit: input.claimType.perClaimLimit,
    dailyTotalBefore,
    monthlyTotalBefore,
    annualTotalBefore,
    rules: fundPolicy,
  })

  const validationFlags: ClaimValidationFlag[] = [...policyEvaluation.flags]
  if (!eligibilitySnapshot.eligible) {
    validationFlags.push({
      flag: "ineligible_employee",
      severity: "error",
      message: "Employee is not eligible for this expense fund.",
      requiresException: true,
    })
  }

  const [recentClaims, receiptDuplicateSignals] = await Promise.all([
    listRecentClaimsForDuplicateScan({
      organizationId: input.organizationId,
      employeeId: input.employee.id,
      claimDate: input.claimDate,
      excludeClaimId: input.excludeClaimId,
    }),
    listReceiptPayloadDuplicateSignalsForSubmit({
      organizationId: input.organizationId,
      payloadHashes: input.receiptPayloadHashes ?? [],
      excludeClaimId: input.excludeClaimId,
    }),
  ])
  const duplicateSignals = mergeClaimDuplicateSignals(
    scoreDuplicateClaims({
      candidate: {
        employeeId: input.employee.id,
        claimDate: input.claimDate,
        amount: input.amount,
        claimNumber: input.claimNumber,
      },
      recentClaims,
    }),
    receiptDuplicateSignals
  )
  const duplicateReviewStatus = hasBlockingDuplicateSignals(duplicateSignals)
    ? "flagged"
    : "clear"

  const reimbursementCurrency =
    input.expenseFund?.currency.toUpperCase() ??
    input.claimType.currency.toUpperCase()
  const claimCurrency = input.claimCurrency.toUpperCase()

  let fxSnapshot: ClaimFxSnapshot | null = null
  if (claimCurrency !== reimbursementCurrency) {
    const resolved = await resolveExchangeRate({
      organizationId: input.organizationId,
      fromCurrency: claimCurrency,
      toCurrency: reimbursementCurrency,
      atDate: input.evaluatedAt,
    })
    if (resolved) {
      fxSnapshot = buildClaimFxSnapshot({
        claimCurrency,
        reimbursementCurrency,
        claimAmount: input.amount,
        rate: Number(resolved.rate),
        rateAsOf: input.evaluatedAt,
        rateSource: resolved.source,
      })
    } else {
      validationFlags.push({
        flag: "fx_rate_missing",
        severity: "error",
        message: `No exchange rate from ${claimCurrency} to ${reimbursementCurrency}.`,
        requiresException: true,
      })
    }
  } else {
    fxSnapshot = buildClaimFxSnapshot({
      claimCurrency,
      reimbursementCurrency,
      claimAmount: input.amount,
      rate: 1,
      rateAsOf: input.evaluatedAt,
      rateSource: "identity",
    })
  }

  const requiresExceptionApproval =
    policyEvaluation.requiresException ||
    !eligibilitySnapshot.eligible ||
    duplicateReviewStatus === "flagged" ||
    validationFlags.some((flag) => flag.requiresException)

  const reimbursementMode = input.expenseFund
    ? "petty_cash_fund"
    : input.claimType.defaultPayoutMethod === "ap"
      ? "employee_ap"
      : "employee_payroll"

  return {
    eligibilitySnapshot,
    validationFlags,
    requiresExceptionApproval,
    duplicateSignals,
    duplicateReviewStatus,
    fxSnapshot,
    reimbursementCurrency,
    reimbursementMode,
  }
}
