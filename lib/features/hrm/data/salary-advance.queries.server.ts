import "server-only"

import { and, desc, eq, isNull, lte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmSalaryAdvance,
  hrmSalaryAdvanceInstallment,
} from "#lib/db/schema"

export type SalaryAdvanceListRow = {
  id: string
  employeeId: string
  employeeLegalName: string
  amount: string
  currency: string
  state: string
  reason: string | null
  requestedAt: Date
}

export async function listSalaryAdvancesForEmployee(
  organizationId: string,
  employeeId: string,
  limit = 50
): Promise<SalaryAdvanceListRow[]> {
  const rows = await db
    .select({
      id: hrmSalaryAdvance.id,
      employeeId: hrmSalaryAdvance.employeeId,
      employeeLegalName: hrmEmployee.legalName,
      amount: hrmSalaryAdvance.amount,
      currency: hrmSalaryAdvance.currency,
      state: hrmSalaryAdvance.state,
      reason: hrmSalaryAdvance.reason,
      requestedAt: hrmSalaryAdvance.requestedAt,
    })
    .from(hrmSalaryAdvance)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmSalaryAdvance.employeeId))
    .where(
      and(
        eq(hrmSalaryAdvance.organizationId, organizationId),
        eq(hrmSalaryAdvance.employeeId, employeeId)
      )
    )
    .orderBy(desc(hrmSalaryAdvance.requestedAt))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    amount: String(r.amount),
  }))
}

export async function listSalaryAdvancesForOrg(
  organizationId: string,
  limit = 100
): Promise<SalaryAdvanceListRow[]> {
  const rows = await db
    .select({
      id: hrmSalaryAdvance.id,
      employeeId: hrmSalaryAdvance.employeeId,
      employeeLegalName: hrmEmployee.legalName,
      amount: hrmSalaryAdvance.amount,
      currency: hrmSalaryAdvance.currency,
      state: hrmSalaryAdvance.state,
      reason: hrmSalaryAdvance.reason,
      requestedAt: hrmSalaryAdvance.requestedAt,
    })
    .from(hrmSalaryAdvance)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmSalaryAdvance.employeeId))
    .where(eq(hrmSalaryAdvance.organizationId, organizationId))
    .orderBy(desc(hrmSalaryAdvance.requestedAt))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    amount: String(r.amount),
  }))
}

export type SalaryAdvanceInstallmentPayrollInput = {
  readonly id: string
  readonly advanceId: string
  readonly amount: string
  readonly currency: string
}

/**
 * Pending installments due on or before period end — payroll engine input snapshot.
 */
export async function listDueSalaryAdvanceInstallmentsForEmployeePayroll(opts: {
  readonly organizationId: string
  readonly employeeId: string
  readonly periodEndIso: string
}): Promise<readonly SalaryAdvanceInstallmentPayrollInput[]> {
  const rows = await db
    .select({
      installmentId: hrmSalaryAdvanceInstallment.id,
      advanceId: hrmSalaryAdvanceInstallment.advanceId,
      plannedAmount: hrmSalaryAdvanceInstallment.plannedAmount,
      currency: hrmSalaryAdvance.currency,
      dueAfterPeriodEndIso: hrmSalaryAdvanceInstallment.dueAfterPeriodEndIso,
    })
    .from(hrmSalaryAdvanceInstallment)
    .innerJoin(
      hrmSalaryAdvance,
      eq(hrmSalaryAdvanceInstallment.advanceId, hrmSalaryAdvance.id)
    )
    .where(
      and(
        eq(hrmSalaryAdvanceInstallment.organizationId, opts.organizationId),
        eq(hrmSalaryAdvance.employeeId, opts.employeeId),
        eq(hrmSalaryAdvance.state, "approved"),
        eq(hrmSalaryAdvanceInstallment.state, "pending"),
        isNull(hrmSalaryAdvance.repaidAt),
        // ISO date string lexicographic comparison is correct for YYYY-MM-DD
        lte(
          sql`${hrmSalaryAdvanceInstallment.dueAfterPeriodEndIso}::text`,
          opts.periodEndIso
        )
      )
    )

  return rows.map((row) => ({
    id: row.installmentId,
    advanceId: row.advanceId,
    amount: String(row.plannedAmount),
    currency: row.currency,
  }))
}

export async function listAdvanceInstallmentsForEmployee(
  organizationId: string,
  employeeId: string,
  _options: { readonly horizonMonths?: number } = {}
): Promise<
  readonly {
    readonly id: string
    readonly advanceId: string
    readonly sequence: number
    readonly dueAfterPeriodEndIso: string
    readonly plannedAmount: string
    readonly state: string
  }[]
> {
  const rows = await db
    .select({
      id: hrmSalaryAdvanceInstallment.id,
      advanceId: hrmSalaryAdvanceInstallment.advanceId,
      sequence: hrmSalaryAdvanceInstallment.sequence,
      dueAfterPeriodEndIso: hrmSalaryAdvanceInstallment.dueAfterPeriodEndIso,
      plannedAmount: hrmSalaryAdvanceInstallment.plannedAmount,
      state: hrmSalaryAdvanceInstallment.state,
    })
    .from(hrmSalaryAdvanceInstallment)
    .innerJoin(
      hrmSalaryAdvance,
      eq(hrmSalaryAdvanceInstallment.advanceId, hrmSalaryAdvance.id)
    )
    .where(
      and(
        eq(hrmSalaryAdvanceInstallment.organizationId, organizationId),
        eq(hrmSalaryAdvance.employeeId, employeeId)
      )
    )
    .orderBy(hrmSalaryAdvanceInstallment.dueAfterPeriodEndIso)

  return rows.map((row) => ({
    ...row,
    dueAfterPeriodEndIso: String(row.dueAfterPeriodEndIso),
    plannedAmount: String(row.plannedAmount),
  }))
}
