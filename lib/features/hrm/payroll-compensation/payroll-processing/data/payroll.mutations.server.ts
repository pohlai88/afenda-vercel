import "server-only"

import { and, eq, gte, isNotNull, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceDay,
  hrmClaim,
  hrmPayrollAdjustment,
  hrmPayrollGroup,
  hrmPayrollLine,
  hrmPayrollPayment,
  hrmPayrollPaymentBatch,
  hrmPayrollPeriod,
  hrmPayrollRun,
  hrmSalaryAdvance,
  hrmSalaryAdvanceInstallment,
} from "#lib/db/schema"

import type { PayrollLineInput } from "./payroll-engine.server"
import type { HrmCompensationSnapshotEntry } from "../../compensation-planning-modeling"

// ---------------------------------------------------------------------------
// Period mutations
// ---------------------------------------------------------------------------

export type CreatePayrollPeriodInput = {
  readonly organizationId: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly cutoffDate: string | null
  readonly paymentDate: string
  readonly payrollGroupCode: string | null
  readonly currency: string
  readonly createdByUserId: string
}

export async function createPayrollPeriodMutation(
  input: CreatePayrollPeriodInput
): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmPayrollPeriod).values({
    id,
    organizationId: input.organizationId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    cutoffDate: input.cutoffDate,
    paymentDate: input.paymentDate,
    payrollGroupCode: input.payrollGroupCode,
    currency: input.currency,
    state: "open",
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
  })
  return { id }
}

export type UpdatePayrollPeriodInput = {
  readonly periodStart?: string
  readonly periodEnd?: string
  readonly cutoffDate?: string | null
  readonly paymentDate?: string
  readonly payrollGroupCode?: string | null
  readonly currency?: string
  readonly updatedByUserId: string
}

export async function updatePayrollPeriodMutation(
  organizationId: string,
  periodId: string,
  input: UpdatePayrollPeriodInput
): Promise<void> {
  await db
    .update(hrmPayrollPeriod)
    .set({
      ...(input.periodStart !== undefined && {
        periodStart: input.periodStart,
      }),
      ...(input.periodEnd !== undefined && { periodEnd: input.periodEnd }),
      ...(input.cutoffDate !== undefined && {
        cutoffDate: input.cutoffDate,
      }),
      ...(input.paymentDate !== undefined && {
        paymentDate: input.paymentDate,
      }),
      ...(input.payrollGroupCode !== undefined && {
        payrollGroupCode: input.payrollGroupCode,
      }),
      ...(input.currency !== undefined && { currency: input.currency }),
      updatedByUserId: input.updatedByUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmPayrollPeriod.organizationId, organizationId),
        eq(hrmPayrollPeriod.id, periodId)
      )
    )
}

export async function updatePayrollPeriodState(
  organizationId: string,
  periodId: string,
  state: string
): Promise<void> {
  await db
    .update(hrmPayrollPeriod)
    .set({ state, updatedAt: new Date() })
    .where(
      and(
        eq(hrmPayrollPeriod.organizationId, organizationId),
        eq(hrmPayrollPeriod.id, periodId)
      )
    )
}

export async function markPayrollPeriodPosted(input: {
  readonly organizationId: string
  readonly periodId: string
  readonly postedByUserId: string
  readonly postedAt?: Date
  readonly postedJournalBatchId?: string | null
}): Promise<void> {
  const postedAt = input.postedAt ?? new Date()
  await db
    .update(hrmPayrollPeriod)
    .set({
      state: "posted",
      postedByUserId: input.postedByUserId,
      postedAt,
      postedJournalBatchId: input.postedJournalBatchId ?? null,
      updatedAt: postedAt,
      updatedByUserId: input.postedByUserId,
    })
    .where(
      and(
        eq(hrmPayrollPeriod.organizationId, input.organizationId),
        eq(hrmPayrollPeriod.id, input.periodId)
      )
    )
}

export async function upsertPayrollGroupMutation(input: {
  readonly organizationId: string
  readonly code: string
  readonly name: string
  readonly countryCode: string
  readonly paySchedule: string
  readonly payCurrency: string
  readonly isActive: boolean
  readonly userId: string
}): Promise<{ id: string }> {
  const existing = await db
    .select({ id: hrmPayrollGroup.id })
    .from(hrmPayrollGroup)
    .where(
      and(
        eq(hrmPayrollGroup.organizationId, input.organizationId),
        eq(hrmPayrollGroup.code, input.code)
      )
    )
    .limit(1)

  if (existing[0]) {
    await db
      .update(hrmPayrollGroup)
      .set({
        name: input.name,
        countryCode: input.countryCode,
        paySchedule: input.paySchedule,
        payCurrency: input.payCurrency,
        isActive: input.isActive,
        updatedByUserId: input.userId,
        updatedAt: new Date(),
      })
      .where(eq(hrmPayrollGroup.id, existing[0].id))

    return { id: existing[0].id }
  }

  const id = crypto.randomUUID()
  await db.insert(hrmPayrollGroup).values({
    id,
    organizationId: input.organizationId,
    code: input.code,
    name: input.name,
    countryCode: input.countryCode,
    paySchedule: input.paySchedule,
    payCurrency: input.payCurrency,
    isActive: input.isActive,
    createdByUserId: input.userId,
    updatedByUserId: input.userId,
  })

  return { id }
}

export async function insertPayrollAdjustment(input: {
  readonly organizationId: string
  readonly periodId: string
  readonly employeeId: string
  readonly kind: string
  readonly amount: string
  readonly currency: string
  readonly reason: string
  readonly approvalId: string | null
  readonly retroReferencePeriodId: string | null
  readonly createdByUserId: string
}): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmPayrollAdjustment).values({
    id,
    organizationId: input.organizationId,
    periodId: input.periodId,
    employeeId: input.employeeId,
    kind: input.kind,
    amount: input.amount,
    currency: input.currency,
    reason: input.reason,
    approvalId: input.approvalId,
    retroReferencePeriodId: input.retroReferencePeriodId,
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
  })
  return { id }
}

export async function insertPayrollPaymentBatch(input: {
  readonly organizationId: string
  readonly periodId: string
  readonly reference: string
  readonly state?: string
  readonly documentId?: string | null
  readonly createdByUserId: string
}): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmPayrollPaymentBatch).values({
    id,
    organizationId: input.organizationId,
    periodId: input.periodId,
    reference: input.reference,
    state: input.state ?? "generated",
    documentId: input.documentId ?? null,
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
  })
  return { id }
}

export async function insertPayrollPaymentRow(input: {
  readonly organizationId: string
  readonly batchId: string
  readonly employeeId: string
  readonly netAmount: string
  readonly currency: string
}): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmPayrollPayment).values({
    id,
    organizationId: input.organizationId,
    batchId: input.batchId,
    employeeId: input.employeeId,
    netAmount: input.netAmount,
    currency: input.currency,
  })
  return { id }
}

export async function updatePayrollPaymentStatus(input: {
  readonly organizationId: string
  readonly paymentId: string
  readonly status: string
  readonly paidAt: Date | null
}): Promise<void> {
  await db
    .update(hrmPayrollPayment)
    .set({
      status: input.status,
      paidAt: input.paidAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmPayrollPayment.organizationId, input.organizationId),
        eq(hrmPayrollPayment.id, input.paymentId)
      )
    )
}

// ---------------------------------------------------------------------------
// Run mutations
// ---------------------------------------------------------------------------

export async function insertPayrollRun(
  organizationId: string,
  periodId: string,
  employeeId: string,
  opts?: {
    contractId?: string | null
    profileId?: string | null
    compensationSnapshot?: readonly HrmCompensationSnapshotEntry[]
    createdByUserId?: string
  }
): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmPayrollRun).values({
    id,
    organizationId,
    periodId,
    employeeId,
    contractId: opts?.contractId ?? null,
    profileId: opts?.profileId ?? null,
    compensationSnapshot: opts?.compensationSnapshot ?? [],
    state: "draft",
  })
  return { id }
}

export type UpdatePayrollRunInput = {
  state?: string
  grossPay?: string
  netPay?: string
  employerCost?: string
  inputDigest?: string
  validationIssues?: Array<{ code: string; message: string }>
  computedByUserId?: string
}

export async function updatePayrollRun(
  organizationId: string,
  runId: string,
  input: UpdatePayrollRunInput
): Promise<void> {
  await db
    .update(hrmPayrollRun)
    .set({
      ...(input.state !== undefined && { state: input.state }),
      ...(input.grossPay !== undefined && { grossPay: input.grossPay }),
      ...(input.netPay !== undefined && { netPay: input.netPay }),
      ...(input.employerCost !== undefined && {
        employerCost: input.employerCost,
      }),
      ...(input.inputDigest !== undefined && {
        inputDigest: input.inputDigest,
      }),
      ...(input.validationIssues !== undefined && {
        validationIssues: input.validationIssues,
      }),
      ...(input.computedByUserId !== undefined && {
        computedByUserId: input.computedByUserId,
        computedAt: new Date(),
      }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmPayrollRun.organizationId, organizationId),
        eq(hrmPayrollRun.id, runId)
      )
    )
}

// ---------------------------------------------------------------------------
// Line mutations
// ---------------------------------------------------------------------------

export async function insertPayrollLines(
  organizationId: string,
  runId: string,
  lines: PayrollLineInput[]
): Promise<void> {
  if (lines.length === 0) return
  await db.insert(hrmPayrollLine).values(
    lines.map((l) => ({
      id: crypto.randomUUID(),
      organizationId,
      runId,
      lineKind: l.lineKind,
      code: l.code,
      description: l.description,
      amount: l.amount,
      rulePackProvenance: l.rulePackProvenance ?? null,
      metadata: l.metadata ?? null,
      claimId: l.claimId ?? null,
      salaryAdvanceId: l.salaryAdvanceId ?? null,
      salaryAdvanceInstallmentId: l.salaryAdvanceInstallmentId ?? null,
    }))
  )
}

export async function deletePayrollLinesForRun(
  organizationId: string,
  runId: string
): Promise<void> {
  await db
    .delete(hrmPayrollLine)
    .where(
      and(
        eq(hrmPayrollLine.organizationId, organizationId),
        eq(hrmPayrollLine.runId, runId)
      )
    )
}

// ---------------------------------------------------------------------------
// Period lock (Phase 3B) — pins rule-pack version + freezes runs + attendance days
// ---------------------------------------------------------------------------

/**
 * Lock a payroll period — pins the rule-pack version, flips runs and
 * attendance-day rows to `locked`, and (Phase 4) flips approved claims
 * linked through `hrm_payroll_line.claimId` to `paid`.
 *
 * Returns the list of `paidClaims` so the caller can write one
 * `erp.hrm.claim.paid` audit per row from a request-scoped context
 * (`writeIamAuditEventFromNextHeaders`); audits stay inside Server
 * Actions so this mutation remains free of `next/headers` imports.
 *
 * Drizzle's Neon HTTP driver does not support `db.transaction`, so these
 * updates are ordered and tenant-guarded rather than wrapped in a transaction.
 */
export async function lockPayrollPeriodAndRunsMutation(opts: {
  readonly organizationId: string
  readonly periodId: string
  readonly rulePackVersion: string
  readonly lockedByUserId: string
  readonly periodStart: string
  readonly periodEnd: string
}): Promise<{
  readonly paidClaims: ReadonlyArray<{
    readonly claimId: string
    readonly payrollLineId: string
  }>
}> {
  const now = new Date()

  await db
    .update(hrmPayrollPeriod)
    .set({
      state: "locked",
      rulePackVersion: opts.rulePackVersion,
      lockedByUserId: opts.lockedByUserId,
      lockedAt: now,
      updatedAt: now,
      updatedByUserId: opts.lockedByUserId,
    })
    .where(
      and(
        eq(hrmPayrollPeriod.organizationId, opts.organizationId),
        eq(hrmPayrollPeriod.id, opts.periodId)
      )
    )

  await db
    .update(hrmPayrollRun)
    .set({
      state: "locked",
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmPayrollRun.organizationId, opts.organizationId),
        eq(hrmPayrollRun.periodId, opts.periodId)
      )
    )

  await db
    .update(hrmAttendanceDay)
    .set({
      state: "locked",
      lockedByPayrollPeriodId: opts.periodId,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmAttendanceDay.organizationId, opts.organizationId),
        gte(hrmAttendanceDay.attendanceDate, opts.periodStart),
        lte(hrmAttendanceDay.attendanceDate, opts.periodEnd)
      )
    )

  // Neon HTTP does not support Drizzle transactions. Keep the lock path
  // serverless-compatible by using guarded, idempotent statements in order.
  const linkedRows = await db
    .select({
      lineId: hrmPayrollLine.id,
      claimId: hrmPayrollLine.claimId,
    })
    .from(hrmPayrollLine)
    .innerJoin(hrmPayrollRun, eq(hrmPayrollRun.id, hrmPayrollLine.runId))
    .where(
      and(
        eq(hrmPayrollLine.organizationId, opts.organizationId),
        eq(hrmPayrollRun.periodId, opts.periodId),
        isNotNull(hrmPayrollLine.claimId)
      )
    )

  const seen = new Set<string>()
  const paidClaims: { claimId: string; payrollLineId: string }[] = []
  for (const row of linkedRows) {
    if (!row.claimId || seen.has(row.claimId)) continue
    seen.add(row.claimId)
    paidClaims.push({ claimId: row.claimId, payrollLineId: row.lineId })
  }

  if (paidClaims.length > 0) {
    const paidAt = new Date()
    for (const entry of paidClaims) {
      await db
        .update(hrmClaim)
        .set({
          state: "paid",
          paidByPayrollLineId: entry.payrollLineId,
          paidAt,
          updatedAt: paidAt,
          updatedByUserId: opts.lockedByUserId,
        })
        .where(
          and(
            eq(hrmClaim.organizationId, opts.organizationId),
            eq(hrmClaim.id, entry.claimId),
            eq(hrmClaim.state, "approved")
          )
        )
    }
  }

  const advanceRows = await db
    .select({
      lineId: hrmPayrollLine.id,
      advanceId: hrmPayrollLine.salaryAdvanceId,
      installmentId: hrmPayrollLine.salaryAdvanceInstallmentId,
    })
    .from(hrmPayrollLine)
    .innerJoin(hrmPayrollRun, eq(hrmPayrollRun.id, hrmPayrollLine.runId))
    .where(
      and(
        eq(hrmPayrollLine.organizationId, opts.organizationId),
        eq(hrmPayrollRun.periodId, opts.periodId),
        isNotNull(hrmPayrollLine.salaryAdvanceId)
      )
    )

  const repaidAt = new Date()
  const touchedAdvanceIds = new Set<string>()

  for (const row of advanceRows) {
    if (!row.advanceId) continue
    touchedAdvanceIds.add(row.advanceId)

    if (row.installmentId) {
      await db
        .update(hrmSalaryAdvanceInstallment)
        .set({
          state: "deducted",
          deductedAt: repaidAt,
          deductedByPayrollLineId: row.lineId,
          updatedAt: repaidAt,
        })
        .where(
          and(
            eq(hrmSalaryAdvanceInstallment.organizationId, opts.organizationId),
            eq(hrmSalaryAdvanceInstallment.id, row.installmentId),
            eq(hrmSalaryAdvanceInstallment.state, "pending")
          )
        )
    }
  }

  for (const advanceId of touchedAdvanceIds) {
    const pending = await db
      .select({ id: hrmSalaryAdvanceInstallment.id })
      .from(hrmSalaryAdvanceInstallment)
      .where(
        and(
          eq(hrmSalaryAdvanceInstallment.organizationId, opts.organizationId),
          eq(hrmSalaryAdvanceInstallment.advanceId, advanceId),
          eq(hrmSalaryAdvanceInstallment.state, "pending")
        )
      )
      .limit(1)

    if (pending.length > 0) continue

    const lineForAdvance = advanceRows.find((r) => r.advanceId === advanceId)
    await db
      .update(hrmSalaryAdvance)
      .set({
        state: "repaid",
        repaidAt,
        repaidByPayrollLineId: lineForAdvance?.lineId ?? null,
        updatedAt: repaidAt,
      })
      .where(
        and(
          eq(hrmSalaryAdvance.organizationId, opts.organizationId),
          eq(hrmSalaryAdvance.id, advanceId),
          eq(hrmSalaryAdvance.state, "approved")
        )
      )
  }

  return { paidClaims }
}
