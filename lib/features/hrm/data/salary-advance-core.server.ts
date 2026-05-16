import "server-only"

import { db } from "#lib/db"
import { hrmSalaryAdvance, hrmSalaryAdvanceInstallment } from "#lib/db/schema"

import { buildAdvanceInstallmentPlan } from "./salary-advance-installment.shared"

export async function materializeSalaryAdvanceInstallments(opts: {
  readonly organizationId: string
  readonly advanceId: string
  readonly amount: string
  readonly installmentCount: number | null | undefined
  readonly firstPeriodEndIso: string | null | undefined
  readonly fallbackPeriodEndIso: string
}): Promise<void> {
  const count = opts.installmentCount ?? 1
  const firstPeriodEnd =
    opts.firstPeriodEndIso?.trim() || opts.fallbackPeriodEndIso

  const plan = buildAdvanceInstallmentPlan({
    totalAmount: opts.amount,
    count,
    firstPeriodEndIso: firstPeriodEnd,
  })

  if (plan.length === 0) return

  await db.insert(hrmSalaryAdvanceInstallment).values(
    plan.map((row) => ({
      id: crypto.randomUUID(),
      organizationId: opts.organizationId,
      advanceId: opts.advanceId,
      sequence: row.sequence,
      dueAfterPeriodEndIso: row.dueAfterPeriodEndIso,
      plannedAmount: row.plannedAmount,
      state: "pending",
    }))
  )
}

export async function insertSalaryAdvanceRow(opts: {
  readonly organizationId: string
  readonly employeeId: string
  readonly amount: string
  readonly currency?: string
  readonly reason: string | null
  readonly requestedByUserId: string
  readonly installmentCount?: number | null
  readonly firstPeriodEndIso?: string | null
}): Promise<string> {
  const advanceId = crypto.randomUUID()
  await db.insert(hrmSalaryAdvance).values({
    id: advanceId,
    organizationId: opts.organizationId,
    employeeId: opts.employeeId,
    amount: opts.amount,
    currency: opts.currency ?? "MYR",
    reason: opts.reason,
    state: "pending",
    requestedByUserId: opts.requestedByUserId,
    installmentCount: opts.installmentCount ?? null,
    firstPeriodEndIso: opts.firstPeriodEndIso ?? null,
  })
  return advanceId
}
