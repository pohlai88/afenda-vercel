import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollGroup } from "#lib/db/schema"

import type { PayrollGroupOption } from "./payroll-group.shared"

export type PayrollGroupRow = PayrollGroupOption

export type { PayrollGroupOption } from "./payroll-group.shared"

export async function listPayrollGroupsForOrg(
  organizationId: string
): Promise<PayrollGroupRow[]> {
  const rows = await db
    .select({
      id: hrmPayrollGroup.id,
      code: hrmPayrollGroup.code,
      name: hrmPayrollGroup.name,
      countryCode: hrmPayrollGroup.countryCode,
      paySchedule: hrmPayrollGroup.paySchedule,
      payCurrency: hrmPayrollGroup.payCurrency,
    })
    .from(hrmPayrollGroup)
    .where(
      and(
        eq(hrmPayrollGroup.organizationId, organizationId),
        eq(hrmPayrollGroup.isActive, true)
      )
    )
    .orderBy(asc(hrmPayrollGroup.code))

  return rows
}
