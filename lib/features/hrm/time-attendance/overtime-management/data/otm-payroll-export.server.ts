import "server-only"

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmOvertimeCalculationSnapshot,
  hrmOvertimeRequest,
  hrmPayrollLine,
  hrmPayrollRun,
} from "#lib/db/schema"

import type { OtmPayrollExportRow } from "./otm.types.shared"
import { hrmOtmRequestStateSchema } from "../schemas/otm-workflow-state.shared"

/** Payroll engine input for one OTM row (HRM-OTM-023). */
export type OtmPayrollEarningInput = {
  readonly overtimeRequestId: string
  readonly payrollLineCode: string
  readonly description: string
  readonly amount: string
  readonly currency: string
  readonly payableMinutes: number
}

function formatAmountFromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export async function listOtmPayrollEarningsForEmployeePeriod(input: {
  organizationId: string
  employeeId: string
  periodStart: string
  periodEnd: string
}): Promise<OtmPayrollEarningInput[]> {
  const requests = await db.query.hrmOvertimeRequest.findMany({
    where: and(
      eq(hrmOvertimeRequest.organizationId, input.organizationId),
      eq(hrmOvertimeRequest.employeeId, input.employeeId),
      eq(hrmOvertimeRequest.state, "payroll_ready"),
      gte(hrmOvertimeRequest.workDate, input.periodStart),
      lte(hrmOvertimeRequest.workDate, input.periodEnd)
    ),
    columns: {
      id: true,
      workDate: true,
      payableMinutes: true,
    },
  })

  if (requests.length === 0) return []

  const requestIds = requests.map((row) => row.id)
  const snapshots = await db.query.hrmOvertimeCalculationSnapshot.findMany({
    where: and(
      eq(hrmOvertimeCalculationSnapshot.organizationId, input.organizationId),
      inArray(hrmOvertimeCalculationSnapshot.requestId, requestIds)
    ),
    columns: {
      requestId: true,
      payableMinutes: true,
      earningCode: true,
      amountCents: true,
      amountCurrency: true,
      multiplierHundredths: true,
    },
  })
  const snapshotMap = new Map(
    snapshots.map((snapshot) => [snapshot.requestId, snapshot])
  )

  const earnings: OtmPayrollEarningInput[] = []
  for (const request of requests) {
    const snapshot = snapshotMap.get(request.id)
    const payableMinutes =
      request.payableMinutes ?? snapshot?.payableMinutes ?? 0
    if (payableMinutes <= 0) continue

    if (!snapshot) continue

    const cents = snapshot.amountCents
    if (cents == null || cents <= 0) continue

    const currency = snapshot.amountCurrency ?? "MYR"
    const earningCode = snapshot.earningCode ?? "OT"

    earnings.push({
      overtimeRequestId: request.id,
      payrollLineCode: earningCode,
      description: `Overtime ${request.workDate} (${payableMinutes} min)`,
      amount: formatAmountFromCents(cents),
      currency,
      payableMinutes,
    })
  }

  return earnings
}

export async function markOtmRequestsPaidForPayrollPeriod(opts: {
  readonly organizationId: string
  readonly periodId: string
  readonly actorUserId: string
}): Promise<
  ReadonlyArray<{ readonly overtimeRequestId: string; readonly payrollLineId: string }>
> {
  const linkedRows = await db
    .select({
      lineId: hrmPayrollLine.id,
      overtimeRequestId: hrmPayrollLine.overtimeRequestId,
    })
    .from(hrmPayrollLine)
    .innerJoin(hrmPayrollRun, eq(hrmPayrollRun.id, hrmPayrollLine.runId))
    .where(
      and(
        eq(hrmPayrollLine.organizationId, opts.organizationId),
        eq(hrmPayrollRun.periodId, opts.periodId)
      )
    )

  const seen = new Set<string>()
  const paid: { overtimeRequestId: string; payrollLineId: string }[] = []
  const now = new Date()

  for (const row of linkedRows) {
    if (!row.overtimeRequestId || seen.has(row.overtimeRequestId)) continue
    seen.add(row.overtimeRequestId)

    await db
      .update(hrmOvertimeRequest)
      .set({
        state: "paid",
        updatedByUserId: opts.actorUserId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hrmOvertimeRequest.organizationId, opts.organizationId),
          eq(hrmOvertimeRequest.id, row.overtimeRequestId),
          eq(hrmOvertimeRequest.state, "payroll_ready")
        )
      )

    paid.push({
      overtimeRequestId: row.overtimeRequestId,
      payrollLineId: row.lineId,
    })
  }

  return paid
}

export async function listOtmPayrollExportRows(
  organizationId: string,
  options?: { states?: ("payroll_ready" | "paid")[]; limit?: number }
): Promise<OtmPayrollExportRow[]> {
  const states = options?.states ?? ["payroll_ready"]
  const limit = options?.limit ?? 500

  const requests = await db.query.hrmOvertimeRequest.findMany({
    where: and(
      eq(hrmOvertimeRequest.organizationId, organizationId),
      inArray(hrmOvertimeRequest.state, states)
    ),
    columns: {
      id: true,
      employeeId: true,
      workDate: true,
      payableMinutes: true,
      state: true,
    },
    orderBy: [desc(hrmOvertimeRequest.workDate)],
    limit,
  })

  if (requests.length === 0) return []

  const requestIds = requests.map((row) => row.id)
  const employeeIds = [...new Set(requests.map((row) => row.employeeId))]

  const [employees, snapshots] = await Promise.all([
    db.query.hrmEmployee.findMany({
      where: and(
        eq(hrmEmployee.organizationId, organizationId),
        inArray(hrmEmployee.id, employeeIds)
      ),
      columns: { id: true, employeeNumber: true, legalName: true },
    }),
    db.query.hrmOvertimeCalculationSnapshot.findMany({
      where: and(
        eq(hrmOvertimeCalculationSnapshot.organizationId, organizationId),
        inArray(hrmOvertimeCalculationSnapshot.requestId, requestIds)
      ),
      columns: {
        requestId: true,
        multiplierHundredths: true,
        earningCode: true,
        payableMinutes: true,
      },
    }),
  ])

  const employeeMap = new Map(
    employees.map((employee) => [
      employee.id,
      { number: employee.employeeNumber, name: employee.legalName },
    ])
  )
  const snapshotMap = new Map(
    snapshots.map((snapshot) => [snapshot.requestId, snapshot])
  )

  return requests.map((row) => {
    const employee = employeeMap.get(row.employeeId)
    const snapshot = snapshotMap.get(row.id)
    const parsedState = hrmOtmRequestStateSchema.safeParse(row.state)
    return {
      requestId: row.id,
      employeeId: row.employeeId,
      employeeNumber: employee?.number ?? null,
      employeeFullName: employee?.name ?? null,
      workDate: row.workDate,
      payableMinutes:
        row.payableMinutes ?? snapshot?.payableMinutes ?? 0,
      multiplierHundredths: snapshot?.multiplierHundredths ?? 100,
      earningCode: snapshot?.earningCode ?? "OT",
      state: parsedState.success ? parsedState.data : "payroll_ready",
    }
  })
}
