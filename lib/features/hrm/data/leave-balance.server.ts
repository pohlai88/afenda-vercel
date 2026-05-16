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

export type {
  HalfDayValue,
  LeaveApprovalSnapshot,
  LeaveBalanceSummary,
  LeaveRequestStateValue,
} from "./leave-balance.shared"
export {
  buildLeaveApprovalSnapshot,
  computeLeaveBalanceSummary,
  detectLeaveOverlap,
} from "./leave-balance.shared"
import type {
  LeaveBalanceSummary,
  LeaveRequestStateValue,
} from "./leave-balance.shared"
import { computeLeaveBalanceSummary } from "./leave-balance.shared"

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

  const [entitlementRow, requests, existing] = await Promise.all([
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
    db.query.hrmLeaveBalance.findFirst({
      where: and(
        eq(hrmLeaveBalance.organizationId, organizationId),
        eq(hrmLeaveBalance.employeeId, employeeId),
        eq(hrmLeaveBalance.leaveTypeId, leaveTypeId),
        eq(hrmLeaveBalance.entitlementYear, entitlementYear)
      ),
      columns: {
        id: true,
        openingDays: true,
        adjustedDays: true,
        carriedForwardDays: true,
      },
    }),
  ])

  const daysEntitled = entitlementRow
    ? Number(entitlementRow.daysProrated ?? entitlementRow.daysGranted)
    : 0

  const summary = computeLeaveBalanceSummary({
    daysEntitled,
    openingDays: existing ? Number(existing.openingDays) : 0,
    adjustedDays: existing ? Number(existing.adjustedDays) : 0,
    carriedForwardDays: existing ? Number(existing.carriedForwardDays) : 0,
    requests: requests.map((r) => ({
      state: r.state as LeaveRequestStateValue,
      durationDays: r.durationDays,
    })),
  })

  const now = new Date()

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
