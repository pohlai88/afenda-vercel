import "server-only"

import { and, count, eq, gte, isNotNull, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmPayrollLine,
  hrmPayrollPeriod,
  hrmPayrollRun,
} from "#lib/db/schema"

export async function countBenefitPayrollLinesByEnrollmentForPeriod(params: {
  readonly organizationId: string
  readonly periodStart: Date
  readonly periodEnd: Date
}): Promise<Map<string, number>> {
  const periodStartIso = params.periodStart.toISOString().slice(0, 10)
  const periodEndIso = params.periodEnd.toISOString().slice(0, 10)

  const rows = await db
    .select({
      benefitEnrollmentId: hrmPayrollLine.benefitEnrollmentId,
      lineCount: count(hrmPayrollLine.id),
    })
    .from(hrmPayrollLine)
    .innerJoin(hrmPayrollRun, eq(hrmPayrollLine.runId, hrmPayrollRun.id))
    .innerJoin(hrmPayrollPeriod, eq(hrmPayrollRun.periodId, hrmPayrollPeriod.id))
    .where(
      and(
        eq(hrmPayrollLine.organizationId, params.organizationId),
        isNotNull(hrmPayrollLine.benefitEnrollmentId),
        lte(hrmPayrollPeriod.periodStart, periodEndIso),
        gte(hrmPayrollPeriod.periodEnd, periodStartIso)
      )
    )
    .groupBy(hrmPayrollLine.benefitEnrollmentId)

  const map = new Map<string, number>()
  for (const row of rows) {
    if (!row.benefitEnrollmentId) continue
    map.set(row.benefitEnrollmentId, Number(row.lineCount ?? 0))
  }
  return map
}
