/**
 * Pure leave balance primitives — no `server-only`, no DB.
 * Imported by `leave-balance.server.ts` and unit tests.
 */

export type LeaveRequestStateValue =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "returned"
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
