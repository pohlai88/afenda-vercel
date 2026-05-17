import "server-only"

import { and, desc, eq, lt, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmPayrollAnomaly,
  hrmPayrollPeriod,
  hrmPayrollRun,
} from "#lib/db/schema"

/** Net-pay variance above this % vs prior locked period is blocking (HRM-PAY-019). */
const BLOCKING_VARIANCE_PCT = 25
const WARNING_VARIANCE_PCT = 10

function parseAmount(value: string): number {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

async function findPriorLockedRunNetPay(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly beforePeriodStart: string
}): Promise<{ periodId: string; netPay: string } | null> {
  const priorPeriods = await db
    .select({ id: hrmPayrollPeriod.id })
    .from(hrmPayrollPeriod)
    .where(
      and(
        eq(hrmPayrollPeriod.organizationId, input.organizationId),
        lt(hrmPayrollPeriod.periodStart, input.beforePeriodStart),
        sql`${hrmPayrollPeriod.state} IN ('locked', 'finalized', 'posted')`
      )
    )
    .orderBy(desc(hrmPayrollPeriod.periodStart))
    .limit(1)

  const priorPeriodId = priorPeriods[0]?.id
  if (!priorPeriodId) return null

  const priorRun = await db
    .select({ netPay: hrmPayrollRun.netPay })
    .from(hrmPayrollRun)
    .where(
      and(
        eq(hrmPayrollRun.organizationId, input.organizationId),
        eq(hrmPayrollRun.periodId, priorPeriodId),
        eq(hrmPayrollRun.employeeId, input.employeeId),
        eq(hrmPayrollRun.state, "locked")
      )
    )
    .limit(1)

  const row = priorRun[0]
  if (!row) return null
  return { periodId: priorPeriodId, netPay: row.netPay }
}

export async function detectPayrollVarianceForPeriod(input: {
  readonly organizationId: string
  readonly periodId: string
  readonly periodStart: string
}): Promise<number> {
  const runs = await db
    .select({
      id: hrmPayrollRun.id,
      employeeId: hrmPayrollRun.employeeId,
      netPay: hrmPayrollRun.netPay,
    })
    .from(hrmPayrollRun)
    .where(
      and(
        eq(hrmPayrollRun.organizationId, input.organizationId),
        eq(hrmPayrollRun.periodId, input.periodId),
        eq(hrmPayrollRun.state, "computed")
      )
    )

  await db
    .delete(hrmPayrollAnomaly)
    .where(
      and(
        eq(hrmPayrollAnomaly.organizationId, input.organizationId),
        eq(hrmPayrollAnomaly.periodId, input.periodId)
      )
    )

  let created = 0
  for (const run of runs) {
    const prior = await findPriorLockedRunNetPay({
      organizationId: input.organizationId,
      employeeId: run.employeeId,
      beforePeriodStart: input.periodStart,
    })
    if (!prior) continue

    const currentNet = parseAmount(run.netPay)
    const priorNet = parseAmount(prior.netPay)
    if (priorNet <= 0) continue

    const variancePct = Math.abs((currentNet - priorNet) / priorNet) * 100
    if (variancePct < WARNING_VARIANCE_PCT) continue

    const severity =
      variancePct >= BLOCKING_VARIANCE_PCT ? "blocking" : "warning"

    await db.insert(hrmPayrollAnomaly).values({
      organizationId: input.organizationId,
      periodId: input.periodId,
      employeeId: run.employeeId,
      code: "net_pay_variance",
      severity,
      message: `Net pay varies ${variancePct.toFixed(1)}% from prior period (${priorNet.toFixed(2)} → ${currentNet.toFixed(2)}).`,
      priorPeriodId: prior.periodId,
      currentAmount: run.netPay,
      priorAmount: prior.netPay,
      variancePct: variancePct.toFixed(4),
    })
    created += 1
  }

  return created
}

export async function countPayrollAnomaliesForPeriod(
  organizationId: string,
  periodId: string
): Promise<{ blocking: number; warning: number }> {
  const rows = await db
    .select({
      severity: hrmPayrollAnomaly.severity,
      count: sql<number>`count(*)::int`,
    })
    .from(hrmPayrollAnomaly)
    .where(
      and(
        eq(hrmPayrollAnomaly.organizationId, organizationId),
        eq(hrmPayrollAnomaly.periodId, periodId)
      )
    )
    .groupBy(hrmPayrollAnomaly.severity)

  let blocking = 0
  let warning = 0
  for (const row of rows) {
    if (row.severity === "blocking") blocking = row.count
    else if (row.severity === "warning") warning = row.count
  }
  return { blocking, warning }
}

export async function hasBlockingPayrollAnomalies(
  organizationId: string,
  periodId: string
): Promise<boolean> {
  const { blocking } = await countPayrollAnomaliesForPeriod(
    organizationId,
    periodId
  )
  return blocking > 0
}
