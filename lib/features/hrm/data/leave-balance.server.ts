/**
 * Leave balance computation primitives (Phase 2B).
 *
 * Two layers:
 *  1. Pure deterministic functions — `computeLeaveBalanceSummary`,
 *     `detectLeaveOverlap`, `buildLeaveApprovalSnapshot` — no DB, fully unit-testable.
 *  2. DB side-effects — `recomputeLeaveBalance` — reads all leave requests for
 *     (org, employee, leaveType, year) and upserts `hrm_leave_balance`.
 *     Idempotent: running it twice produces the same result.
 */
import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmLeaveBalance,
  hrmLeaveEntitlement,
  hrmLeaveRequest,
} from "#lib/db/schema"

// ---------------------------------------------------------------------------
// Domain value types (shared between pure and DB layers)
// ---------------------------------------------------------------------------

export type LeaveRequestStateValue =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "taken"

export type HalfDayValue = "none" | "morning" | "afternoon"

/** Immutable approval snapshot — preserves exactly what the approver saw. */
export type LeaveApprovalSnapshot = {
  readonly objectType: "leave_request"
  readonly employeeId: string
  readonly employeeNumber: string | null
  readonly employeeFullName: string
  readonly leaveTypeId: string
  readonly leaveTypeCode: string
  readonly startDate: string
  readonly endDate: string
  readonly durationDays: number
  readonly halfDay: HalfDayValue
  readonly reason: string | null
  /** balance BEFORE this request is counted */
  readonly balanceBefore: number
  /** balance AFTER this request would be approved */
  readonly balanceAfter: number
  readonly daysEntitled: number
  readonly daysTaken: number
  readonly daysPending: number
  readonly policyVersion: string | null
  readonly requestedAt: string
}

export type LeaveBalanceSummary = {
  readonly daysTaken: number
  readonly daysPending: number
  readonly daysAvailable: number
}

// ---------------------------------------------------------------------------
// Pure functions (unit-testable, no DB imports)
// ---------------------------------------------------------------------------

/**
 * Computes balance summary from entitlement and a set of leave requests.
 * `available = openingDays + daysEntitled + adjustedDays + carriedForwardDays
 *              − daysTaken − daysPending`
 */
export function computeLeaveBalanceSummary(params: {
  daysEntitled: number
  openingDays?: number
  adjustedDays?: number
  carriedForwardDays?: number
  requests: ReadonlyArray<{
    state: LeaveRequestStateValue
    durationDays: number | string
  }>
}): LeaveBalanceSummary {
  const {
    daysEntitled,
    openingDays = 0,
    adjustedDays = 0,
    carriedForwardDays = 0,
    requests,
  } = params

  let daysTaken = 0
  let daysPending = 0

  for (const req of requests) {
    const days = Number(req.durationDays)
    if (req.state === "approved" || req.state === "taken") {
      daysTaken += days
    } else if (req.state === "submitted") {
      daysPending += days
    }
  }

  const daysAvailable =
    openingDays +
    daysEntitled +
    adjustedDays +
    carriedForwardDays -
    daysTaken -
    daysPending

  return { daysTaken, daysPending, daysAvailable }
}

/**
 * Returns true if the candidate range overlaps any active (submitted | approved | taken)
 * request in `existingRequests`.
 * Overlap condition: NOT (candidateEnd < existingStart OR candidateStart > existingEnd)
 */
export function detectLeaveOverlap(
  candidateStart: string,
  candidateEnd: string,
  existingRequests: ReadonlyArray<{
    state: LeaveRequestStateValue
    startDate: string
    endDate: string
  }>
): boolean {
  const ACTIVE_STATES: LeaveRequestStateValue[] = [
    "submitted",
    "approved",
    "taken",
  ]
  return existingRequests
    .filter((r) => (ACTIVE_STATES as string[]).includes(r.state))
    .some((r) => !(candidateEnd < r.startDate || candidateStart > r.endDate))
}

/**
 * Builds the immutable approval snapshot that the approver sees.
 * Must be called BEFORE any balance update so `balanceBefore` is accurate.
 *
 * `balanceBefore` accepts the extended type returned by `readLeaveBalance`
 * so `daysEntitled` is populated in the snapshot.
 */
export function buildLeaveApprovalSnapshot(params: {
  employeeId: string
  employeeNumber: string | null
  employeeFullName: string
  leaveTypeId: string
  leaveTypeCode: string
  startDate: string
  endDate: string
  durationDays: number
  halfDay: HalfDayValue
  reason: string | null
  balanceBefore: LeaveBalanceSummary & { daysEntitled?: number }
  policyVersion: string | null
  requestedAt: Date
}): LeaveApprovalSnapshot {
  return {
    objectType: "leave_request",
    employeeId: params.employeeId,
    employeeNumber: params.employeeNumber,
    employeeFullName: params.employeeFullName,
    leaveTypeId: params.leaveTypeId,
    leaveTypeCode: params.leaveTypeCode,
    startDate: params.startDate,
    endDate: params.endDate,
    durationDays: params.durationDays,
    halfDay: params.halfDay,
    reason: params.reason,
    balanceBefore: params.balanceBefore.daysAvailable,
    balanceAfter: params.balanceBefore.daysAvailable - params.durationDays,
    daysEntitled: params.balanceBefore.daysEntitled ?? 0,
    daysTaken: params.balanceBefore.daysTaken,
    daysPending: params.balanceBefore.daysPending,
    policyVersion: params.policyVersion,
    requestedAt: params.requestedAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// DB side-effects
// ---------------------------------------------------------------------------

/**
 * Recomputes leave balance for (org, employee, leaveType, year) from scratch and upserts
 * `hrm_leave_balance`. Idempotent — safe to call after any state transition.
 */
export async function recomputeLeaveBalance(
  organizationId: string,
  employeeId: string,
  leaveTypeId: string,
  entitlementYear: number
): Promise<LeaveBalanceSummary> {
  const ACTIVE_STATES: LeaveRequestStateValue[] = [
    "submitted",
    "approved",
    "taken",
  ]

  const [entitlementRow, requests] = await Promise.all([
    db.query.hrmLeaveEntitlement.findFirst({
      where: and(
        eq(hrmLeaveEntitlement.organizationId, organizationId),
        eq(hrmLeaveEntitlement.employeeId, employeeId),
        eq(hrmLeaveEntitlement.leaveTypeId, leaveTypeId),
        eq(hrmLeaveEntitlement.entitlementYear, entitlementYear)
      ),
      columns: {
        daysGranted: true,
        daysProrated: true,
      },
    }),
    db.query.hrmLeaveRequest.findMany({
      where: and(
        eq(hrmLeaveRequest.organizationId, organizationId),
        eq(hrmLeaveRequest.employeeId, employeeId),
        eq(hrmLeaveRequest.leaveTypeId, leaveTypeId),
        inArray(hrmLeaveRequest.state, ACTIVE_STATES)
      ),
      columns: { state: true, durationDays: true, startDate: true },
    }),
  ])

  const daysEntitled = entitlementRow
    ? Number(entitlementRow.daysProrated ?? entitlementRow.daysGranted)
    : 0

  const summary = computeLeaveBalanceSummary({
    daysEntitled,
    requests: requests.map((r) => ({
      state: r.state as LeaveRequestStateValue,
      durationDays: r.durationDays,
    })),
  })

  const now = new Date()

  const existing = await db.query.hrmLeaveBalance.findFirst({
    where: and(
      eq(hrmLeaveBalance.organizationId, organizationId),
      eq(hrmLeaveBalance.employeeId, employeeId),
      eq(hrmLeaveBalance.leaveTypeId, leaveTypeId),
      eq(hrmLeaveBalance.entitlementYear, entitlementYear)
    ),
    columns: { id: true },
  })

  if (existing) {
    await db
      .update(hrmLeaveBalance)
      .set({
        daysEntitled: String(daysEntitled),
        daysTaken: String(summary.daysTaken),
        daysPending: String(summary.daysPending),
        lastRecomputedAt: now,
        updatedAt: now,
      })
      .where(eq(hrmLeaveBalance.id, existing.id))
  } else {
    await db.insert(hrmLeaveBalance).values({
      organizationId,
      employeeId,
      leaveTypeId,
      entitlementYear,
      daysEntitled: String(daysEntitled),
      daysTaken: String(summary.daysTaken),
      daysPending: String(summary.daysPending),
      lastRecomputedAt: now,
    })
  }

  return summary
}

/**
 * Reads current balance from cache (or returns zeroed summary if no cache row exists).
 * Used to build the approval snapshot BEFORE submitting a request.
 */
export async function readLeaveBalance(
  organizationId: string,
  employeeId: string,
  leaveTypeId: string,
  entitlementYear: number
): Promise<LeaveBalanceSummary & { daysEntitled: number }> {
  const row = await db.query.hrmLeaveBalance.findFirst({
    where: and(
      eq(hrmLeaveBalance.organizationId, organizationId),
      eq(hrmLeaveBalance.employeeId, employeeId),
      eq(hrmLeaveBalance.leaveTypeId, leaveTypeId),
      eq(hrmLeaveBalance.entitlementYear, entitlementYear)
    ),
    columns: {
      daysEntitled: true,
      daysTaken: true,
      daysPending: true,
      openingDays: true,
      adjustedDays: true,
      carriedForwardDays: true,
    },
  })

  if (!row) {
    return { daysEntitled: 0, daysTaken: 0, daysPending: 0, daysAvailable: 0 }
  }

  const daysEntitled = Number(row.daysEntitled)
  const daysTaken = Number(row.daysTaken)
  const daysPending = Number(row.daysPending)
  const opening = Number(row.openingDays)
  const adjusted = Number(row.adjustedDays)
  const carried = Number(row.carriedForwardDays)

  return {
    daysEntitled,
    daysTaken,
    daysPending,
    daysAvailable:
      opening + daysEntitled + adjusted + carried - daysTaken - daysPending,
  }
}

/**
 * Fetches existing active requests for an employee + leaveType in order to
 * run overlap detection before submitting a new request.
 */
export async function listActiveLeaveRequestsForOverlapCheck(
  organizationId: string,
  employeeId: string,
  leaveTypeId: string,
  excludeRequestId?: string
): Promise<
  ReadonlyArray<{
    state: LeaveRequestStateValue
    startDate: string
    endDate: string
  }>
> {
  const ACTIVE_STATES: LeaveRequestStateValue[] = [
    "submitted",
    "approved",
    "taken",
  ]

  const rows = await db.query.hrmLeaveRequest.findMany({
    where: and(
      eq(hrmLeaveRequest.organizationId, organizationId),
      eq(hrmLeaveRequest.employeeId, employeeId),
      eq(hrmLeaveRequest.leaveTypeId, leaveTypeId),
      inArray(hrmLeaveRequest.state, ACTIVE_STATES)
    ),
    columns: { id: true, state: true, startDate: true, endDate: true },
  })

  return rows
    .filter((r) => r.id !== excludeRequestId)
    .map((r) => ({
      state: r.state as LeaveRequestStateValue,
      startDate: r.startDate,
      endDate: r.endDate,
    }))
}

/** Reads the employee identity fields needed to build an approval snapshot. */
export async function readEmployeeForApprovalSnapshot(
  organizationId: string,
  employeeId: string
): Promise<{
  employeeNumber: string
  legalName: string
  managerEmployeeId: string | null
} | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.id, employeeId)
    ),
    columns: {
      employeeNumber: true,
      legalName: true,
      managerEmployeeId: true,
    },
  })
  return row ?? null
}
