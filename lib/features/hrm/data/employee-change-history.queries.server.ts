import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployeeChangeHistory } from "#lib/db/schema"

export type EmployeeChangeHistoryRow = {
  id: string
  fieldName: string
  oldValue: unknown
  newValue: unknown
  changedByUserId: string
  changedAt: Date
}

export async function listEmployeeChangeHistory(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly limit?: number
}): Promise<EmployeeChangeHistoryRow[]> {
  const limit = Math.min(Math.max(input.limit ?? 80, 1), 200)
  return db
    .select({
      id: hrmEmployeeChangeHistory.id,
      fieldName: hrmEmployeeChangeHistory.fieldName,
      oldValue: hrmEmployeeChangeHistory.oldValue,
      newValue: hrmEmployeeChangeHistory.newValue,
      changedByUserId: hrmEmployeeChangeHistory.changedByUserId,
      changedAt: hrmEmployeeChangeHistory.changedAt,
    })
    .from(hrmEmployeeChangeHistory)
    .where(
      and(
        eq(hrmEmployeeChangeHistory.organizationId, input.organizationId),
        eq(hrmEmployeeChangeHistory.employeeId, input.employeeId)
      )
    )
    .orderBy(desc(hrmEmployeeChangeHistory.changedAt))
    .limit(limit)
}
