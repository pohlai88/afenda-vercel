import "server-only"

import { and, asc, eq, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollProfile } from "#lib/db/schema"

import type { PayrollGroupOption } from "./payroll-group.shared"

export type PayrollGroupRow = PayrollGroupOption

export type { PayrollGroupOption } from "./payroll-group.shared"

export async function listPayrollGroupsForOrg(
  organizationId: string
): Promise<PayrollGroupRow[]> {
  const rows = await db
    .select({
      code: hrmPayrollProfile.payrollGroupCode,
      countryCode: hrmPayrollProfile.countryCode,
      paySchedule: hrmPayrollProfile.paySchedule,
      payCurrency: hrmPayrollProfile.payCurrency,
    })
    .from(hrmPayrollProfile)
    .where(
      and(
        eq(hrmPayrollProfile.organizationId, organizationId),
        isNotNull(hrmPayrollProfile.payrollGroupCode)
      )
    )
    .orderBy(asc(hrmPayrollProfile.payrollGroupCode))

  const unique = new Map<string, PayrollGroupRow>()
  for (const row of rows) {
    if (!row.code) continue
    unique.set(row.code, {
      id: row.code,
      code: row.code,
      name: row.code,
      countryCode: row.countryCode,
      paySchedule: row.paySchedule,
      payCurrency: row.payCurrency,
    })
  }

  return [...unique.values()]
}
