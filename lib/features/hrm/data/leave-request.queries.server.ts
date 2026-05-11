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
