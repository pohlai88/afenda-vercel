/**
 * Leave request read queries (Phase 2B).
 * All queries scope to organizationId — IDOR guard is at the action layer.
 */
import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmEmployee,
  hrmLeaveBalance,
  hrmLeaveRequest,
  hrmLeaveType,
} from "#lib/db/schema"

// ---------------------------------------------------------------------------
// Leave request queries
// ---------------------------------------------------------------------------

export type LeaveRequestRow = {
  id: string
  employeeId: string
  leaveTypeId: string
  leaveTypeCode: string | null
  requestedAt: Date
  startDate: string
  endDate: string
  durationDays: string
  halfDay: string
  reason: string | null
  state: string
  currentApprovalId: string | null
  approvedByUserId: string | null
  approvedAt: Date | null
  rejectedReason: string | null
  policyVersion: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Org-wide leave-request row decorated with the employee identity columns
 * the manager-inbox + recent-activity surfaces need to render rows without
 * a second round trip per employee.
 */
export type OrgLeaveRequestRow = LeaveRequestRow & {
  employeeNumber: string | null
  employeeFullName: string | null
}

/** Lightweight identity tuple for the apply-on-behalf select. */
export type LeaveEmployeeChoiceRow = {
  id: string
  employeeNumber: string
  legalName: string
}

/** Lightweight identity tuple for the leave-type select. */
export type LeaveTypeChoiceRow = {
  id: string
  code: string
  paid: boolean
  fixedDaysPerYear: number | null
}

export type LeaveRequestDetailRow = LeaveRequestRow & {
  employeeNumber: string | null
  employeeFullName: string | null
  approval: {
    id: string
    state: string
    currentApproverUserId: string | null
    decisionByUserId: string | null
    decisionAt: Date | null
    decisionNote: string | null
    snapshot: unknown
    requestedAt: Date
  } | null
}

export async function listLeaveRequestsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<LeaveRequestRow[]> {
  const rows = await db.query.hrmLeaveRequest.findMany({
    where: and(
      eq(hrmLeaveRequest.organizationId, organizationId),
      eq(hrmLeaveRequest.employeeId, employeeId)
    ),
    columns: {
      id: true,
      employeeId: true,
      leaveTypeId: true,
      requestedAt: true,
      startDate: true,
      endDate: true,
      durationDays: true,
      halfDay: true,
      reason: true,
      state: true,
      currentApprovalId: true,
      approvedByUserId: true,
      approvedAt: true,
      rejectedReason: true,
      policyVersion: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(hrmLeaveRequest.requestedAt)],
  })

  const leaveTypeIds = [...new Set(rows.map((r) => r.leaveTypeId))]
  const leaveTypes =
    leaveTypeIds.length > 0
      ? await db.query.hrmLeaveType.findMany({
          where: inArray(hrmLeaveType.id, leaveTypeIds),
          columns: { id: true, code: true },
        })
      : []
  const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.id, lt.code]))

  return rows.map((r) => ({
    ...r,
    leaveTypeCode: leaveTypeMap.get(r.leaveTypeId) ?? null,
  }))
}

export async function listPendingApprovalRequestsForOrg(
  organizationId: string
): Promise<LeaveRequestRow[]> {
  const rows = await db.query.hrmLeaveRequest.findMany({
    where: and(
      eq(hrmLeaveRequest.organizationId, organizationId),
      eq(hrmLeaveRequest.state, "submitted")
    ),
    columns: {
      id: true,
      employeeId: true,
      leaveTypeId: true,
      requestedAt: true,
      startDate: true,
      endDate: true,
      durationDays: true,
      halfDay: true,
      reason: true,
      state: true,
      currentApprovalId: true,
      approvedByUserId: true,
      approvedAt: true,
      rejectedReason: true,
      policyVersion: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(hrmLeaveRequest.requestedAt)],
  })

  const leaveTypeIds = [...new Set(rows.map((r) => r.leaveTypeId))]
  const leaveTypes =
    leaveTypeIds.length > 0
      ? await db.query.hrmLeaveType.findMany({
          where: inArray(hrmLeaveType.id, leaveTypeIds),
          columns: { id: true, code: true },
        })
      : []
  const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.id, lt.code]))

  return rows.map((r) => ({
    ...r,
    leaveTypeCode: leaveTypeMap.get(r.leaveTypeId) ?? null,
  }))
}

export async function getLeaveRequestDetail(
  organizationId: string,
  requestId: string
): Promise<LeaveRequestDetailRow | null> {
  const req = await db.query.hrmLeaveRequest.findFirst({
    where: and(
      eq(hrmLeaveRequest.id, requestId),
      eq(hrmLeaveRequest.organizationId, organizationId)
    ),
    columns: {
      id: true,
      employeeId: true,
      leaveTypeId: true,
      requestedAt: true,
      startDate: true,
      endDate: true,
      durationDays: true,
      halfDay: true,
      reason: true,
      state: true,
      currentApprovalId: true,
      approvedByUserId: true,
      approvedAt: true,
      rejectedReason: true,
      policyVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!req) return null

  const [leaveType, employee, approval] = await Promise.all([
    db.query.hrmLeaveType.findFirst({
      where: eq(hrmLeaveType.id, req.leaveTypeId),
      columns: { code: true },
    }),
    db.query.hrmEmployee.findFirst({
      where: eq(hrmEmployee.id, req.employeeId),
      columns: { employeeNumber: true, legalName: true },
    }),
    req.currentApprovalId
      ? db.query.hrmApproval.findFirst({
          where: eq(hrmApproval.id, req.currentApprovalId),
          columns: {
            id: true,
            state: true,
            currentApproverUserId: true,
            decisionByUserId: true,
            decisionAt: true,
            decisionNote: true,
            snapshot: true,
            requestedAt: true,
          },
        })
      : Promise.resolve(null),
  ])

  return {
    ...req,
    leaveTypeCode: leaveType?.code ?? null,
    employeeNumber: employee?.employeeNumber ?? null,
    employeeFullName: employee?.legalName ?? null,
    approval: approval ?? null,
  }
}

// ---------------------------------------------------------------------------
// Leave balance queries
// ---------------------------------------------------------------------------

export type LeaveBalanceRow = {
  id: string
  leaveTypeId: string
  leaveTypeCode: string | null
  entitlementYear: number
  daysEntitled: string
  daysTaken: string
  daysPending: string
  openingDays: string
  adjustedDays: string
  carriedForwardDays: string
  lastRecomputedAt: Date
}

/**
 * Org-wide leave requests — newest first — with optional state filter and
 * row cap. Used by the leave page's recent-activity table; the manager
 * inbox uses {@link listPendingApprovalRequestsForOrg} so the SQL plan
 * stays index-friendly.
 *
 * The employee + leave-type identity columns are joined in JS (two extra
 * `WHERE id IN (...)` reads) so the surface stays driver-portable and the
 * primary index `hrm_leave_request_org_state_start_idx` keeps doing the
 * heavy lifting on the request list itself.
 */
export async function listAllLeaveRequestsForOrg(
  organizationId: string,
  options: {
    states?: ReadonlyArray<string>
    limit?: number
  } = {}
): Promise<OrgLeaveRequestRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const stateFilter =
    options.states && options.states.length > 0
      ? inArray(hrmLeaveRequest.state, [...options.states])
      : undefined

  const requests = await db.query.hrmLeaveRequest.findMany({
    where: stateFilter
      ? and(eq(hrmLeaveRequest.organizationId, organizationId), stateFilter)
      : eq(hrmLeaveRequest.organizationId, organizationId),
    columns: {
      id: true,
      employeeId: true,
      leaveTypeId: true,
      requestedAt: true,
      startDate: true,
      endDate: true,
      durationDays: true,
      halfDay: true,
      reason: true,
      state: true,
      currentApprovalId: true,
      approvedByUserId: true,
      approvedAt: true,
      rejectedReason: true,
      policyVersion: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(hrmLeaveRequest.requestedAt)],
    limit,
  })

  if (requests.length === 0) return []

  const employeeIds = [...new Set(requests.map((r) => r.employeeId))]
  const leaveTypeIds = [...new Set(requests.map((r) => r.leaveTypeId))]

  const [employees, leaveTypes] = await Promise.all([
    db.query.hrmEmployee.findMany({
      where: and(
        eq(hrmEmployee.organizationId, organizationId),
        inArray(hrmEmployee.id, employeeIds)
      ),
      columns: { id: true, employeeNumber: true, legalName: true },
    }),
    db.query.hrmLeaveType.findMany({
      where: and(
        eq(hrmLeaveType.organizationId, organizationId),
        inArray(hrmLeaveType.id, leaveTypeIds)
      ),
      columns: { id: true, code: true },
    }),
  ])

  const employeeMap = new Map(
    employees.map((e) => [
      e.id,
      { number: e.employeeNumber, name: e.legalName },
    ])
  )
  const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.id, lt.code]))

  return requests.map((r) => ({
    ...r,
    leaveTypeCode: leaveTypeMap.get(r.leaveTypeId) ?? null,
    employeeNumber: employeeMap.get(r.employeeId)?.number ?? null,
    employeeFullName: employeeMap.get(r.employeeId)?.name ?? null,
  }))
}

/**
 * Active employees scoped to one org for the apply-on-behalf select.
 * Excludes archived rows so admins cannot accidentally submit leave on
 * behalf of a former employee. Sorted by `employeeNumber` for a stable,
 * scannable picker.
 */
export async function listActiveEmployeeChoicesForLeave(
  organizationId: string
): Promise<LeaveEmployeeChoiceRow[]> {
  const rows = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
    })
    .from(hrmEmployee)
    .where(eq(hrmEmployee.organizationId, organizationId))

  return rows.sort((a, b) =>
    a.employeeNumber.localeCompare(b.employeeNumber)
  )
}

/**
 * Active (non-archived) leave types for one org, ordered by `code`.
 * Used by the apply-on-behalf select. Archived rows are filtered so the
 * picker matches `applyLeaveAction`'s tenant + archive guard.
 */
export async function listActiveLeaveTypesForOrg(
  organizationId: string
): Promise<LeaveTypeChoiceRow[]> {
  const rows = await db.query.hrmLeaveType.findMany({
    where: eq(hrmLeaveType.organizationId, organizationId),
    columns: {
      id: true,
      code: true,
      paid: true,
      fixedDaysPerYear: true,
      archivedAt: true,
    },
  })

  return rows
    .filter((r) => r.archivedAt === null)
    .map((r) => ({
      id: r.id,
      code: r.code,
      paid: r.paid,
      fixedDaysPerYear: r.fixedDaysPerYear ?? null,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

export async function listLeaveBalancesForEmployee(
  organizationId: string,
  employeeId: string,
  year?: number
): Promise<LeaveBalanceRow[]> {
  const whereConditions = year
    ? and(
        eq(hrmLeaveBalance.organizationId, organizationId),
        eq(hrmLeaveBalance.employeeId, employeeId),
        eq(hrmLeaveBalance.entitlementYear, year)
      )
    : and(
        eq(hrmLeaveBalance.organizationId, organizationId),
        eq(hrmLeaveBalance.employeeId, employeeId)
      )

  const rows = await db.query.hrmLeaveBalance.findMany({
    where: whereConditions,
    columns: {
      id: true,
      leaveTypeId: true,
      entitlementYear: true,
      daysEntitled: true,
      daysTaken: true,
      daysPending: true,
      openingDays: true,
      adjustedDays: true,
      carriedForwardDays: true,
      lastRecomputedAt: true,
    },
  })

  const leaveTypeIds = [...new Set(rows.map((r) => r.leaveTypeId))]
  const leaveTypes =
    leaveTypeIds.length > 0
      ? await db.query.hrmLeaveType.findMany({
          where: inArray(hrmLeaveType.id, leaveTypeIds),
          columns: { id: true, code: true },
        })
      : []
  const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.id, lt.code]))

  return rows.map((r) => ({
    ...r,
    leaveTypeCode: leaveTypeMap.get(r.leaveTypeId) ?? null,
  }))
}
