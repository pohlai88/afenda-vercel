import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmKpiPeriod, hrmKpiScore } from "#lib/db/schema"

export type KpiPeriodRow = {
  id: string
  name: string
  periodStart: Date
  periodEnd: Date
  state: string
}

export async function listKpiPeriodsForOrg(
  organizationId: string
): Promise<KpiPeriodRow[]> {
  return db
    .select({
      id: hrmKpiPeriod.id,
      name: hrmKpiPeriod.name,
      periodStart: hrmKpiPeriod.periodStart,
      periodEnd: hrmKpiPeriod.periodEnd,
      state: hrmKpiPeriod.state,
    })
    .from(hrmKpiPeriod)
    .where(eq(hrmKpiPeriod.organizationId, organizationId))
    .orderBy(desc(hrmKpiPeriod.createdAt))
}

export type KpiScoreListRow = {
  id: string
  periodId: string
  employeeId: string
  employeeLegalName: string
  metricCode: string
  targetValue: string | null
  achievedValue: string | null
  notes: string | null
}

export async function listKpiScoresForPeriod(
  organizationId: string,
  periodId: string
): Promise<KpiScoreListRow[]> {
  const rows = await db
    .select({
      id: hrmKpiScore.id,
      periodId: hrmKpiScore.periodId,
      employeeId: hrmKpiScore.employeeId,
      employeeLegalName: hrmEmployee.legalName,
      metricCode: hrmKpiScore.metricCode,
      targetValue: hrmKpiScore.targetValue,
      achievedValue: hrmKpiScore.achievedValue,
      notes: hrmKpiScore.notes,
    })
    .from(hrmKpiScore)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmKpiScore.employeeId))
    .where(
      and(
        eq(hrmKpiScore.organizationId, organizationId),
        eq(hrmKpiScore.periodId, periodId)
      )
    )

  return rows
}
