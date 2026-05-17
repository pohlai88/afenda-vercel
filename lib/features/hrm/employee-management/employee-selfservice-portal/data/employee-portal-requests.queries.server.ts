import "server-only"

import { listClaimsForEmployee } from "../../../payroll-compensation/expenses-reimbursement/data/claim.queries.server"
import { listLeaveRequestsForEmployee } from "../../../workforce-time-attendance/data/leave-request.queries.server"
import { listSalaryAdvancesForEmployee } from "../../../payroll-compensation/payroll-processing/data/salary-advance.queries.server"
import { listEnrollmentsForEmployee } from "../../../payroll-compensation/benefits-administration/data/benefit.queries.server"
import { listPendingSignaturePartiesForEmployee } from "#features/tools/server"

export type EmployeePortalOpenRequestKind =
  | "leave"
  | "claim"
  | "salary_advance"
  | "benefit_enrollment"
  | "signature"

export type EmployeePortalOpenRequestRow = {
  readonly id: string
  readonly kind: EmployeePortalOpenRequestKind
  readonly status: string
  readonly label: string
  readonly submittedAt: Date
}

const OPEN_LEAVE_STATES = new Set(["submitted"])
const OPEN_CLAIM_STATES = new Set(["submitted", "draft"])
const OPEN_ADVANCE_STATES = new Set(["pending"])
const OPEN_BENEFIT_STATES = new Set(["pending"])

/**
 * Aggregates in-flight employee requests across portal domains (HRM-ESS-018).
 * Read-only — powers a future unified "My requests" hub.
 */
export async function listEmployeePortalOpenRequests(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly limitPerKind?: number
}): Promise<EmployeePortalOpenRequestRow[]> {
  const limit = input.limitPerKind ?? 20

  const [leaveRows, claimRows, advanceRows, benefitRows, signatureRows] =
    await Promise.all([
      listLeaveRequestsForEmployee(input.organizationId, input.employeeId),
      listClaimsForEmployee(input.organizationId, input.employeeId, {
        limit,
      }),
      listSalaryAdvancesForEmployee(
        input.organizationId,
        input.employeeId,
        limit
      ),
      listEnrollmentsForEmployee(input.organizationId, input.employeeId),
      listPendingSignaturePartiesForEmployee(
        input.organizationId,
        input.employeeId
      ),
    ])

  const rows: EmployeePortalOpenRequestRow[] = []

  for (const leave of leaveRows) {
    if (!OPEN_LEAVE_STATES.has(leave.state)) continue
    rows.push({
      id: leave.id,
      kind: "leave",
      status: leave.state,
      label: leave.leaveTypeCode ?? "Leave",
      submittedAt: leave.requestedAt,
    })
  }

  for (const claim of claimRows) {
    if (!OPEN_CLAIM_STATES.has(claim.state)) continue
    rows.push({
      id: claim.id,
      kind: "claim",
      status: claim.state,
      label: claim.claimTypeName ?? "Claim",
      submittedAt: claim.submittedAt ?? new Date(`${claim.claimDate}T00:00:00.000Z`),
    })
  }

  for (const advance of advanceRows) {
    if (!OPEN_ADVANCE_STATES.has(advance.state)) continue
    rows.push({
      id: advance.id,
      kind: "salary_advance",
      status: advance.state,
      label: "Salary advance",
      submittedAt: advance.requestedAt,
    })
  }

  for (const enrollment of benefitRows) {
    if (!OPEN_BENEFIT_STATES.has(enrollment.state)) continue
    rows.push({
      id: enrollment.enrollmentId,
      kind: "benefit_enrollment",
      status: enrollment.state,
      label: enrollment.benefitName ?? "Benefit enrollment",
      submittedAt:
        enrollment.enrolledAt ??
        new Date(`${enrollment.effectiveFrom}T00:00:00.000Z`),
    })
  }

  for (const { party, request } of signatureRows) {
    rows.push({
      id: party.id,
      kind: "signature",
      status: request.derivedStatus,
      label: request.kind,
      submittedAt: request.sentAt ?? request.createdAt,
    })
  }

  return rows
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
    .slice(0, limit * 5)
}
