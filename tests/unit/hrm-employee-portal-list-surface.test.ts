import { describe, expect, it } from "vitest"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"
import {
  buildEmployeePortalAdvanceListSurfaceConfiguration,
  buildEmployeePortalClaimsListSurfaceConfiguration,
  buildEmployeePortalTrainingDueListSurfaceConfiguration,
  buildEmployeePortalTrainingHistoryListSurfaceConfiguration,
} from "#features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-list-surface.server"
import type { ClaimRow } from "#features/hrm/payroll-compensation/expenses-reimbursement/data/claim.queries.server"
import type { SalaryAdvanceListRow } from "#features/hrm/payroll-compensation/payroll-processing/data/salary-advance.queries.server"
import type {
  HrmTrainingAssignmentRow,
  HrmTrainingRecord,
} from "#features/hrm/talent-management/training-development/data/training.types.shared"

const CLAIM_ROW = {
  id: "claim-1",
  claimTypeId: "type-1",
  claimTypeCode: "TRAVEL",
  claimDate: "2026-03-01",
  amount: "120.00",
  currency: "MYR",
  state: "submitted",
  evidenceCount: 1,
  employeeId: "emp-1",
  employeeNumber: "E001",
  employeeFullName: "Alex Example",
  submittedAt: new Date("2026-03-01T00:00:00.000Z"),
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
} as const satisfies ClaimRow

const ADVANCE_ROW = {
  id: "adv-1",
  amount: "500",
  currency: "MYR",
  state: "pending",
  requestedAt: new Date("2026-03-01T00:00:00.000Z"),
  reason: "Emergency",
} as const satisfies SalaryAdvanceListRow

const TRAINING_ASSIGNMENT = {
  id: "assign-1",
  courseId: "course-1",
  courseName: "Safety",
  sessionId: null,
  dueAt: new Date("2026-04-01T00:00:00.000Z"),
  state: "assigned",
} as const satisfies HrmTrainingAssignmentRow

const TRAINING_RECORD = {
  id: "record-1",
  courseName: "Safety",
  completedAt: new Date("2026-02-01T00:00:00.000Z"),
  verificationState: "verified",
  feedbackRating: null,
} as const satisfies HrmTrainingRecord

const claimStateLabels = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  returned: "Returned",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  paid: "Paid",
} as const

describe("employee portal list surface builders", () => {
  it("marks claims trailing ready when row actions are enabled", () => {
    const config = buildEmployeePortalClaimsListSurfaceConfiguration(
      [CLAIM_ROW],
      () => "/claims/claim-1",
      {
        empty: "No claims",
        colClaimDate: "Date",
        colAmount: "Amount",
        colState: "State",
        colEvidence: "Evidence",
        evidenceCountLabel: (count) => String(count),
        stateLabels: claimStateLabels,
      },
      { showRowActions: true }
    ) as ListSurfaceRendererConfiguration

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })

  it("marks advance trailing ready only for pending advances", () => {
    const pending = buildEmployeePortalAdvanceListSurfaceConfiguration(
      [ADVANCE_ROW],
      {
        empty: "No advances",
        colAmount: "Amount",
        colState: "State",
        colRequested: "Requested",
        colReason: "Reason",
        stateLabelFor: (state) => state,
      },
      { showRowActions: true }
    ) as ListSurfaceRendererConfiguration

    expect(pending.rows[0]?.trailingAction).toEqual({ state: "ready" })

    const approved = buildEmployeePortalAdvanceListSurfaceConfiguration(
      [{ ...ADVANCE_ROW, state: "approved" }],
      {
        empty: "No advances",
        colAmount: "Amount",
        colState: "State",
        colRequested: "Requested",
        colReason: "Reason",
        stateLabelFor: (state) => state,
      },
      { showRowActions: true }
    ) as ListSurfaceRendererConfiguration

    expect(approved.rows[0]?.trailingAction).toEqual({ state: "hidden" })
  })

  it("marks training due trailing ready when actions are enabled", () => {
    const config = buildEmployeePortalTrainingDueListSurfaceConfiguration(
      [TRAINING_ASSIGNMENT],
      {
        empty: "No due training",
        colCourse: "Course",
        colDue: "Due",
        colState: "State",
        formatDue: () => "Apr 1, 2026",
      },
      { showRowActions: true }
    ) as ListSurfaceRendererConfiguration

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })

  it("hides training history trailing when feedback already exists", () => {
    const config = buildEmployeePortalTrainingHistoryListSurfaceConfiguration(
      [{ ...TRAINING_RECORD, feedbackRating: 5 }],
      {
        empty: "No history",
        colCourse: "Course",
        colCompleted: "Completed",
        colVerification: "Verification",
        colFeedback: "Feedback",
        formatCompleted: () => "Feb 1, 2026",
        feedbackGivenLabel: (rating) => `${rating}/5`,
      },
      { showRowActions: true }
    ) as ListSurfaceRendererConfiguration

    expect(config.rows[0]?.trailingAction).toEqual({ state: "hidden" })
  })
})
