import "server-only"

import { and, eq, or, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmKpiGoal } from "#lib/db/schema"

import type { KpiGoalRow } from "./kpi-goal.queries.server"

export async function listKpiGoalsVisibleToEmployee(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly limit?: number
}): Promise<KpiGoalRow[]> {
  const limit = input.limit ?? 50
  const sharedContains = sql`${hrmKpiGoal.sharedWithEmployeeIds} @> ${JSON.stringify([input.employeeId])}::jsonb`

  const rows = await db
    .select({
      id: hrmKpiGoal.id,
      organizationId: hrmKpiGoal.organizationId,
      ownerEmployeeId: hrmKpiGoal.ownerEmployeeId,
      ownerLegalName: hrmEmployee.legalName,
      title: hrmKpiGoal.title,
      description: hrmKpiGoal.description,
      status: hrmKpiGoal.status,
      percentComplete: hrmKpiGoal.percentComplete,
      dueDate: hrmKpiGoal.dueDate,
      completionDate: hrmKpiGoal.completionDate,
      alignsWithGoalId: hrmKpiGoal.alignsWithGoalId,
      sharedWithEmployeeIds: hrmKpiGoal.sharedWithEmployeeIds,
      createdAt: hrmKpiGoal.createdAt,
      updatedAt: hrmKpiGoal.updatedAt,
    })
    .from(hrmKpiGoal)
    .innerJoin(hrmEmployee, eq(hrmKpiGoal.ownerEmployeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmKpiGoal.organizationId, input.organizationId),
        or(eq(hrmKpiGoal.ownerEmployeeId, input.employeeId), sharedContains)
      )
    )
    .orderBy(hrmKpiGoal.dueDate)
    .limit(limit)

  return rows.map((row) => ({
    ...row,
    sharedWithEmployeeIds: Array.isArray(row.sharedWithEmployeeIds)
      ? [...row.sharedWithEmployeeIds]
      : [],
  }))
}
