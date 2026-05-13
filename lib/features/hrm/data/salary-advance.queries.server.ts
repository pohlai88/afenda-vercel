import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmSalaryAdvance } from "#lib/db/schema"

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

export type SalaryAdvancePayrollInput = {
  id: string
  amount: string
  currency: string
}

/**
 * Approved advances not yet repaid — included in payroll engine input snapshot.
 */
export async function listApprovedSalaryAdvancesForEmployeePayroll(opts: {
  readonly organizationId: string
  readonly employeeId: string
  readonly periodEndIso: string
}): Promise<readonly SalaryAdvancePayrollInput[]> {
  const rows = await db
    .select({
      id: hrmSalaryAdvance.id,
      amount: hrmSalaryAdvance.amount,
      currency: hrmSalaryAdvance.currency,
      requestedAt: hrmSalaryAdvance.requestedAt,
    })
    .from(hrmSalaryAdvance)
    .where(
      and(
        eq(hrmSalaryAdvance.organizationId, opts.organizationId),
        eq(hrmSalaryAdvance.employeeId, opts.employeeId),
        eq(hrmSalaryAdvance.state, "approved"),
        isNull(hrmSalaryAdvance.repaidAt)
      )
    )

  const end = opts.periodEndIso
  return rows
    .filter((r) => {
      const req = r.requestedAt.toISOString().slice(0, 10)
      return req <= end
    })
    .map((r) => ({
      id: r.id,
      amount: String(r.amount),
      currency: r.currency,
    }))
}
