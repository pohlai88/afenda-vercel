/**
 * Leave request read queries (Phase 2B).
 * All queries scope to organizationId — IDOR guard is at the action layer.
 */
import "server-only"

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmEmployee,
  hrmLeaveBalance,
  hrmLeaveRequest,
  hrmLeaveType,
} from "#lib/db/schema"
import { listUserIdsWithErpPermission } from "#features/erp-rbac/server"

import {
  parseHrmApprovalState,
  parseHrmLeaveRequestState,
  type HrmApprovalState,
  type HrmLeaveRequestState,
} from "../schemas/hrm-workflow-state.shared"

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
  state: HrmLeaveRequestState
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
  currentApproverUserId: string | null
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

export type LeaveEmployeeContextRow = {
  id: string
  employeeNumber: string
  legalName: string
  gender: string | null
  countryCode: string | null
  workStateCode: string | null
  employmentStartDate: Date | null
  linkedUserId: string | null
  managerEmployeeId: string | null
  archivedAt: Date | null
}

export type LeaveTypeContextRow = {
  id: string
  code: string
  archivedAt: Date | null
  genderRestriction: string | null
  maxCarryForwardDays: number
  carryForwardExpiryMonths: number | null
}

export type LeaveRequestDetailRow = LeaveRequestRow & {
  employeeNumber: string | null
  employeeFullName: string | null
  approval: {
    id: string
    state: HrmApprovalState
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
    state: parseHrmLeaveRequestState(r.state),
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
    state: parseHrmLeaveRequestState(r.state),
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
    state: parseHrmLeaveRequestState(req.state),
    leaveTypeCode: leaveType?.code ?? null,
    employeeNumber: employee?.employeeNumber ?? null,
    employeeFullName: employee?.legalName ?? null,
    approval: approval
      ? {
          ...approval,
          state: parseHrmApprovalState(approval.state),
        }
      : null,
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
    assignedApproverUserId?: string
    employeeId?: string
  } = {}
): Promise<OrgLeaveRequestRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const stateFilter =
    options.states && options.states.length > 0
      ? inArray(hrmLeaveRequest.state, [...options.states])
      : undefined
  const assignedRequestIds = options.assignedApproverUserId
    ? (
        await db.query.hrmApproval.findMany({
          where: and(
            eq(hrmApproval.organizationId, organizationId),
            eq(hrmApproval.subjectKind, "leave_request"),
            eq(hrmApproval.state, "pending"),
            eq(
              hrmApproval.currentApproverUserId,
              options.assignedApproverUserId
            )
          ),
          columns: { subjectId: true },
        })
      ).map((row) => row.subjectId)
    : null

  if (assignedRequestIds && assignedRequestIds.length === 0) return []

  const requests = await db.query.hrmLeaveRequest.findMany({
    where: and(
      eq(hrmLeaveRequest.organizationId, organizationId),
      stateFilter,
      options.employeeId
        ? eq(hrmLeaveRequest.employeeId, options.employeeId)
        : undefined,
      assignedRequestIds
        ? inArray(hrmLeaveRequest.id, assignedRequestIds)
        : undefined
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
    limit,
  })

  if (requests.length === 0) return []

  const employeeIds = [...new Set(requests.map((r) => r.employeeId))]
  const leaveTypeIds = [...new Set(requests.map((r) => r.leaveTypeId))]
  const approvalIds = [
    ...new Set(
      requests.flatMap((r) =>
        r.currentApprovalId ? [r.currentApprovalId] : []
      )
    ),
  ]

  const [employees, leaveTypes, approvals] = await Promise.all([
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
    approvalIds.length > 0
      ? db.query.hrmApproval.findMany({
          where: and(
            eq(hrmApproval.organizationId, organizationId),
            inArray(hrmApproval.id, approvalIds)
          ),
          columns: { id: true, currentApproverUserId: true },
        })
      : Promise.resolve([]),
  ])

  const employeeMap = new Map(
    employees.map((e) => [
      e.id,
      { number: e.employeeNumber, name: e.legalName },
    ])
  )
  const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.id, lt.code]))
  const approvalMap = new Map(
    approvals.map((approval) => [approval.id, approval.currentApproverUserId])
  )

  return requests.map((r) => ({
    ...r,
    state: parseHrmLeaveRequestState(r.state),
    leaveTypeCode: leaveTypeMap.get(r.leaveTypeId) ?? null,
    employeeNumber: employeeMap.get(r.employeeId)?.number ?? null,
    employeeFullName: employeeMap.get(r.employeeId)?.name ?? null,
    currentApproverUserId: r.currentApprovalId
      ? (approvalMap.get(r.currentApprovalId) ?? null)
      : null,
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
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )
    .orderBy(asc(hrmEmployee.employeeNumber))

  return rows
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

export async function findLeaveEmployeeForUser(
  organizationId: string,
  userId: string
): Promise<LeaveEmployeeContextRow | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.linkedUserId, userId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      gender: true,
      countryCode: true,
      workStateCode: true,
      employmentStartDate: true,
      linkedUserId: true,
      managerEmployeeId: true,
      archivedAt: true,
    },
  })

  return row ?? null
}

export async function getLeaveEmployeeForOrg(
  organizationId: string,
  employeeId: string
): Promise<LeaveEmployeeContextRow | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.id, employeeId)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      gender: true,
      countryCode: true,
      workStateCode: true,
      employmentStartDate: true,
      linkedUserId: true,
      managerEmployeeId: true,
      archivedAt: true,
    },
  })

  return row ?? null
}

export async function getLeaveTypeForRequest(
  organizationId: string,
  leaveTypeId: string
): Promise<LeaveTypeContextRow | null> {
  const row = await db.query.hrmLeaveType.findFirst({
    where: and(
      eq(hrmLeaveType.organizationId, organizationId),
      eq(hrmLeaveType.id, leaveTypeId)
    ),
    columns: {
      id: true,
      code: true,
      archivedAt: true,
      genderRestriction: true,
      maxCarryForwardDays: true,
      carryForwardExpiryMonths: true,
    },
  })

  return row ?? null
}

export async function resolveManagerApproverUserId(input: {
  organizationId: string
  managerEmployeeId: string | null
}): Promise<string | null> {
  if (!input.managerEmployeeId) return null

  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.managerEmployeeId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: { linkedUserId: true },
  })

  return row?.linkedUserId ?? null
}

export async function resolveLeaveApproverUserId(input: {
  organizationId: string
  managerEmployeeId: string | null
}): Promise<string | null> {
  const managerUserId = await resolveManagerApproverUserId(input)
  if (managerUserId) return managerUserId

  const [fallbackApproverUserId] = await listUserIdsWithErpPermission({
    organizationId: input.organizationId,
    permission: { module: "hrm", object: "leave", function: "update" },
  })

  return fallbackApproverUserId ?? null
}
