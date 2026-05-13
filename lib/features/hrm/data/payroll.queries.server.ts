import "server-only"

import { and, desc, eq, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmEmployee,
  hrmEmploymentContract,
  hrmPayrollLine,
  hrmPayrollPeriod,
  hrmPayrollProfile,
  hrmPayrollRun,
} from "#lib/db/schema"

import { listAttendanceDaysForPayroll } from "./attendance.queries.server"
import { listApprovedUnpaidClaimsForPeriod } from "./claim.queries.server"
import { listApprovedSalaryAdvancesForEmployeePayroll } from "./salary-advance.queries.server"
import { PAYROLL_PERIOD_LOCK_SUBJECT_KIND } from "../schemas/payroll-period.schema"
import { parseMalaysiaPcbStatutoryExtras } from "../schemas/malaysia-pcb-statutory-extras.shared"

import type { PayrollEngineInput } from "./payroll-engine.server"

// ---------------------------------------------------------------------------
// Period queries
// ---------------------------------------------------------------------------

export type PayrollPeriodRow = {
  id: string
  organizationId: string
  periodStart: string
  periodEnd: string
  paymentDate: string
  currency: string
  state: string
  lockedByUserId: string | null
  lockedAt: Date | null
  finalizedRunId: string | null
  rulePackVersion: string | null
  createdByUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export async function listPayrollPeriodsForOrg(
  organizationId: string
): Promise<PayrollPeriodRow[]> {
  const rows = await db
    .select({
      id: hrmPayrollPeriod.id,
      organizationId: hrmPayrollPeriod.organizationId,
      periodStart: hrmPayrollPeriod.periodStart,
      periodEnd: hrmPayrollPeriod.periodEnd,
      paymentDate: hrmPayrollPeriod.paymentDate,
      currency: hrmPayrollPeriod.currency,
      state: hrmPayrollPeriod.state,
      lockedByUserId: hrmPayrollPeriod.lockedByUserId,
      lockedAt: hrmPayrollPeriod.lockedAt,
      finalizedRunId: hrmPayrollPeriod.finalizedRunId,
      rulePackVersion: hrmPayrollPeriod.rulePackVersion,
      createdByUserId: hrmPayrollPeriod.createdByUserId,
      createdAt: hrmPayrollPeriod.createdAt,
      updatedAt: hrmPayrollPeriod.updatedAt,
    })
    .from(hrmPayrollPeriod)
    .where(eq(hrmPayrollPeriod.organizationId, organizationId))
    .orderBy(desc(hrmPayrollPeriod.periodStart))

  return rows
}

export async function getPayrollPeriod(
  organizationId: string,
  periodId: string
): Promise<PayrollPeriodRow | null> {
  const row = await db
    .select({
      id: hrmPayrollPeriod.id,
      organizationId: hrmPayrollPeriod.organizationId,
      periodStart: hrmPayrollPeriod.periodStart,
      periodEnd: hrmPayrollPeriod.periodEnd,
      paymentDate: hrmPayrollPeriod.paymentDate,
      currency: hrmPayrollPeriod.currency,
      state: hrmPayrollPeriod.state,
      lockedByUserId: hrmPayrollPeriod.lockedByUserId,
      lockedAt: hrmPayrollPeriod.lockedAt,
      finalizedRunId: hrmPayrollPeriod.finalizedRunId,
      rulePackVersion: hrmPayrollPeriod.rulePackVersion,
      createdByUserId: hrmPayrollPeriod.createdByUserId,
      createdAt: hrmPayrollPeriod.createdAt,
      updatedAt: hrmPayrollPeriod.updatedAt,
    })
    .from(hrmPayrollPeriod)
    .where(
      and(
        eq(hrmPayrollPeriod.organizationId, organizationId),
        eq(hrmPayrollPeriod.id, periodId)
      )
    )
    .limit(1)

  return row[0] ?? null
}

// ---------------------------------------------------------------------------
// Run queries
// ---------------------------------------------------------------------------

export type PayrollRunRow = {
  id: string
  organizationId: string
  periodId: string
  employeeId: string
  employeeLegalName: string
  employeeNumber: string
  contractId: string | null
  profileId: string | null
  state: string
  grossPay: string
  netPay: string
  employerCost: string
  inputDigest: string | null
  computedAt: Date | null
  computedByUserId: string | null
  overriddenFromBureau: boolean
  validationIssues: Array<{ code: string; message: string }>
}

export async function listPayrollRunsForPeriod(
  organizationId: string,
  periodId: string
): Promise<PayrollRunRow[]> {
  const rows = await db
    .select({
      id: hrmPayrollRun.id,
      organizationId: hrmPayrollRun.organizationId,
      periodId: hrmPayrollRun.periodId,
      employeeId: hrmPayrollRun.employeeId,
      employeeLegalName: hrmEmployee.legalName,
      employeeNumber: hrmEmployee.employeeNumber,
      contractId: hrmPayrollRun.contractId,
      profileId: hrmPayrollRun.profileId,
      state: hrmPayrollRun.state,
      grossPay: hrmPayrollRun.grossPay,
      netPay: hrmPayrollRun.netPay,
      employerCost: hrmPayrollRun.employerCost,
      inputDigest: hrmPayrollRun.inputDigest,
      computedAt: hrmPayrollRun.computedAt,
      computedByUserId: hrmPayrollRun.computedByUserId,
      overriddenFromBureau: hrmPayrollRun.overriddenFromBureau,
      validationIssues: hrmPayrollRun.validationIssues,
    })
    .from(hrmPayrollRun)
    .innerJoin(hrmEmployee, eq(hrmPayrollRun.employeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmPayrollRun.organizationId, organizationId),
        eq(hrmPayrollRun.periodId, periodId)
      )
    )
    .orderBy(hrmEmployee.legalName)

  return rows.map((r) => ({
    ...r,
    validationIssues: (r.validationIssues ?? []) as Array<{
      code: string
      message: string
    }>,
  }))
}

// ---------------------------------------------------------------------------
// Line queries
// ---------------------------------------------------------------------------

export type PayrollLineRow = {
  id: string
  runId: string
  lineKind: string
  code: string
  description: string
  amount: string
  rulePackProvenance: Record<string, unknown> | null
}

export async function listPayrollLinesForRun(
  organizationId: string,
  runId: string
): Promise<PayrollLineRow[]> {
  const rows = await db
    .select({
      id: hrmPayrollLine.id,
      runId: hrmPayrollLine.runId,
      lineKind: hrmPayrollLine.lineKind,
      code: hrmPayrollLine.code,
      description: hrmPayrollLine.description,
      amount: hrmPayrollLine.amount,
      rulePackProvenance: hrmPayrollLine.rulePackProvenance,
    })
    .from(hrmPayrollLine)
    .where(
      and(
        eq(hrmPayrollLine.organizationId, organizationId),
        eq(hrmPayrollLine.runId, runId)
      )
    )

  return rows.map((r) => ({
    ...r,
    rulePackProvenance: (r.rulePackProvenance ?? null) as Record<
      string,
      unknown
    > | null,
  }))
}

// ---------------------------------------------------------------------------
// Input snapshot query (used by the workflow step)
// ---------------------------------------------------------------------------

/** Builds the PayrollEngineInput from DB snapshots of the run's contract + profile. */
export async function getPayrollRunInputSnapshot(
  organizationId: string,
  runId: string
): Promise<PayrollEngineInput | null> {
  const runRow = await db
    .select({
      id: hrmPayrollRun.id,
      periodId: hrmPayrollRun.periodId,
      employeeId: hrmPayrollRun.employeeId,
      contractId: hrmPayrollRun.contractId,
      profileId: hrmPayrollRun.profileId,
    })
    .from(hrmPayrollRun)
    .where(
      and(
        eq(hrmPayrollRun.organizationId, organizationId),
        eq(hrmPayrollRun.id, runId)
      )
    )
    .limit(1)

  const run = runRow[0]
  if (!run) return null

  // Fetch period
  const periodRow = await db
    .select({
      periodStart: hrmPayrollPeriod.periodStart,
      periodEnd: hrmPayrollPeriod.periodEnd,
    })
    .from(hrmPayrollPeriod)
    .where(
      and(
        eq(hrmPayrollPeriod.organizationId, organizationId),
        eq(hrmPayrollPeriod.id, run.periodId)
      )
    )
    .limit(1)

  const period = periodRow[0]
  if (!period) return null

  const periodEndIso =
    typeof period.periodEnd === "string"
      ? String(period.periodEnd).slice(0, 10)
      : (period.periodEnd as Date).toISOString().slice(0, 10)

  const ymd = periodEndIso.slice(0, 10).split("-")
  const yRaw = Number.parseInt(ymd[0] ?? "2026", 10)
  const mRaw = Number.parseInt(ymd[1] ?? "1", 10)
  const yearNumber = Number.isFinite(yRaw) ? yRaw : 2026
  const monthNumber =
    Number.isFinite(mRaw) && mRaw >= 1 && mRaw <= 12 ? mRaw : 1

  // Phase 4 — Approved-but-not-yet-paid claims for this employee whose
  // `claimDate` falls inside the period window. Pre-fetched here so the
  // engine remains IO-free; emitted as one earning line per claim with
  // `claimId` populated so the period lock can flip the claim to `paid`.
  const allApprovedUnpaid = await listApprovedUnpaidClaimsForPeriod(
    organizationId,
    period.periodStart,
    period.periodEnd
  )
  const approvedUnpaidClaims = allApprovedUnpaid
    .filter((row) => row.employeeId === run.employeeId)
    .map((row) => ({
      claimId: row.id,
      payrollLineCode: row.claimTypeCode || "ALLOWANCE_CLAIM",
      description: row.description ?? `${row.claimTypeName} (${row.claimDate})`,
      amount: row.amount,
      currency: row.currency,
    }))

  // Fetch active contract (for salary)
  let baseSalaryAmount = "0"
  let baseSalaryCurrency = "MYR"
  if (run.contractId) {
    const contractRow = await db
      .select({
        baseSalaryAmount: hrmEmploymentContract.baseSalaryAmount,
        baseSalaryCurrency: hrmEmploymentContract.baseSalaryCurrency,
      })
      .from(hrmEmploymentContract)
      .where(eq(hrmEmploymentContract.id, run.contractId))
      .limit(1)
    const contract = contractRow[0]
    if (contract) {
      baseSalaryAmount = contract.baseSalaryAmount ?? "0"
      baseSalaryCurrency = contract.baseSalaryCurrency ?? "MYR"
    }
  }

  // Fetch payroll profile (for country code + Malaysia PCB TP1/TP3 extras)
  let countryCode = "MY"
  let pcbTp1AdditionalReliefMonthly = "0.00"
  let pcbTp3AdditionalDeductionMonthly = "0.00"
  if (run.profileId) {
    const profileRow = await db
      .select({
        countryCode: hrmPayrollProfile.countryCode,
        statutoryProfileExtras: hrmPayrollProfile.statutoryProfileExtras,
      })
      .from(hrmPayrollProfile)
      .where(eq(hrmPayrollProfile.id, run.profileId))
      .limit(1)
    const profile = profileRow[0]
    if (profile) {
      countryCode = profile.countryCode
      const pcb = parseMalaysiaPcbStatutoryExtras(
        profile.statutoryProfileExtras
      )
      pcbTp1AdditionalReliefMonthly = pcb.pcbTp1AdditionalReliefMonthly
      pcbTp3AdditionalDeductionMonthly = pcb.pcbTp3AdditionalDeductionMonthly
    }
  }

  return {
    organizationId,
    periodId: run.periodId,
    employeeId: run.employeeId,
    contractId: run.contractId,
    profileId: run.profileId,
    countryCode,
    basicSalaryAmount: baseSalaryAmount,
    basicSalaryCurrency: baseSalaryCurrency,
    periodEnd: periodEndIso,
    // Leave and overtime minute feeds remain reserved; payroll readiness is checked separately.
    unpaidLeaveMinutes: 0,
    scheduledMinutes: 8 * 60 * 22, // 22 working days × 8 hours — default until attendance wiring
    overtimeMinutes: 0,
    // Phase 3B statutory fields — defaults until payroll profile is enriched with these
    epfMemberCategory: null,
    employeeAgeBand: null,
    socsoCategory: null,
    eisEligible: true,
    hrdfApplicable: false,
    taxResidency: null,
    monthNumber,
    yearNumber,
    ytdRemuneration: null,
    ytdPcbPaid: null,
    ytdEpfEmployee: null,
    pcbTp1AdditionalReliefMonthly,
    pcbTp3AdditionalDeductionMonthly,
    approvedUnpaidClaims,
    approvedSalaryAdvances: await listApprovedSalaryAdvancesForEmployeePayroll({
      organizationId,
      employeeId: run.employeeId,
      periodEndIso,
    }),
  }
}

/** Attendance rows in the period window must be `computed` or `locked`; absent rows → ready. */
export async function isAttendancePayrollReadyForPeriod(opts: {
  readonly organizationId: string
  readonly periodStart: string
  readonly periodEnd: string
}): Promise<boolean> {
  const rows = await listAttendanceDaysForPayroll({
    organizationId: opts.organizationId,
    fromDate: opts.periodStart,
    toDate: opts.periodEnd,
  })
  if (rows.length === 0) return true
  return rows.every((r) => r.state === "computed" || r.state === "locked")
}

export async function hasApprovedPayrollPeriodLockApproval(
  organizationId: string,
  periodId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: hrmApproval.id })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, organizationId),
        eq(hrmApproval.subjectKind, PAYROLL_PERIOD_LOCK_SUBJECT_KIND),
        eq(hrmApproval.subjectId, periodId),
        eq(hrmApproval.state, "approved")
      )
    )
    .limit(1)
  return rows.length > 0
}

export async function getPendingPayrollPeriodLockApprovalId(
  organizationId: string,
  periodId: string
): Promise<string | null> {
  const rows = await db
    .select({ id: hrmApproval.id })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, organizationId),
        eq(hrmApproval.subjectKind, PAYROLL_PERIOD_LOCK_SUBJECT_KIND),
        eq(hrmApproval.subjectId, periodId),
        eq(hrmApproval.state, "pending")
      )
    )
    .limit(1)
  return rows[0]?.id ?? null
}

/**
 * Majority country code among payroll runs in a period that snapshot a
 * payroll profile (null profiles ignored). Defaults to **MY** when no
 * profile-linked runs exist — matches Malaysia-first payroll defaults.
 */
export async function getPayrollPeriodPrimaryCountryCode(
  organizationId: string,
  periodId: string
): Promise<string> {
  const rows = await db
    .select({ countryCode: hrmPayrollProfile.countryCode })
    .from(hrmPayrollRun)
    .innerJoin(
      hrmPayrollProfile,
      eq(hrmPayrollRun.profileId, hrmPayrollProfile.id)
    )
    .where(
      and(
        eq(hrmPayrollRun.organizationId, organizationId),
        eq(hrmPayrollRun.periodId, periodId),
        isNotNull(hrmPayrollRun.profileId)
      )
    )

  if (rows.length === 0) return "MY"

  const counts = new Map<string, number>()
  for (const r of rows) {
    const cc = r.countryCode?.trim() || "MY"
    counts.set(cc, (counts.get(cc) ?? 0) + 1)
  }

  let bestCode = "MY"
  let bestCount = -1
  for (const [code, count] of counts) {
    if (count > bestCount || (count === bestCount && code === "MY")) {
      bestCode = code
      bestCount = count
    }
  }
  return bestCode
}
