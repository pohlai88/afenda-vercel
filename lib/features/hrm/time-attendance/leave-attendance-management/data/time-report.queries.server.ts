import "server-only"

import { and, desc, eq, inArray, ne } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmTimeReport } from "#lib/db/schema"

export type OrgTimeReportRow = {
  id: string
  employeeId: string
  reportKind: string
  workDate: string | null
  overtimeMinutes: number | null
  tripStartDate: string | null
  tripEndDate: string | null
  destination: string | null
  reason: string | null
  state: string
  currentApprovalId: string | null
  requestedAt: Date
  approvedAt: Date | null
  updatedAt: Date
  employeeNumber: string | null
  employeeFullName: string | null
}

/**
 * Org-wide time reports (OT / business trip) for inbox and activity views.
 */
export async function listTimeReportsForOrg(
  organizationId: string,
  options: {
    readonly states?: ReadonlyArray<string>
    readonly limit?: number
  } = {}
): Promise<OrgTimeReportRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const stateFilter =
    options.states && options.states.length > 0
      ? inArray(hrmTimeReport.state, [...options.states])
      : undefined

  const excludeLegacyOvertime = ne(hrmTimeReport.reportKind, "overtime")
  const rows = await db.query.hrmTimeReport.findMany({
    where: stateFilter
      ? and(
          eq(hrmTimeReport.organizationId, organizationId),
          stateFilter,
          excludeLegacyOvertime
        )
      : and(
          eq(hrmTimeReport.organizationId, organizationId),
          excludeLegacyOvertime
        ),
    columns: {
      id: true,
      employeeId: true,
      reportKind: true,
      workDate: true,
      overtimeMinutes: true,
      tripStartDate: true,
      tripEndDate: true,
      destination: true,
      reason: true,
      state: true,
      currentApprovalId: true,
      createdAt: true,
      approvedAt: true,
      updatedAt: true,
    },
    orderBy: [desc(hrmTimeReport.createdAt)],
    limit,
  })

  if (rows.length === 0) return []

  const employeeIds = [...new Set(rows.map((r) => r.employeeId))]
  const employees = await db.query.hrmEmployee.findMany({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      inArray(hrmEmployee.id, employeeIds)
    ),
    columns: { id: true, employeeNumber: true, legalName: true },
  })
  const employeeMap = new Map(
    employees.map((e) => [
      e.id,
      { number: e.employeeNumber, name: e.legalName },
    ])
  )

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    reportKind: r.reportKind,
    workDate: r.workDate ?? null,
    overtimeMinutes: r.overtimeMinutes ?? null,
    tripStartDate: r.tripStartDate ?? null,
    tripEndDate: r.tripEndDate ?? null,
    destination: r.destination ?? null,
    reason: r.reason ?? null,
    state: r.state,
    currentApprovalId: r.currentApprovalId ?? null,
    requestedAt: r.createdAt,
    approvedAt: r.approvedAt ?? null,
    updatedAt: r.updatedAt,
    employeeNumber: employeeMap.get(r.employeeId)?.number ?? null,
    employeeFullName: employeeMap.get(r.employeeId)?.name ?? null,
  }))
}
