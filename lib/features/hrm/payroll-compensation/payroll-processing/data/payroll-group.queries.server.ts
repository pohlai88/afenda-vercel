import "server-only"

import { asc, eq } from "drizzle-orm"

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
    .where(eq(hrmPayrollGroup.organizationId, organizationId))
    .orderBy(asc(hrmPayrollGroup.code))

  return rows
}
