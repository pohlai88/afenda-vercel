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
  claimNumber: "C-0001",
  employeeId: "emp-1",
  employeeNumber: "E001",
  employeeFullName: "Alex Example",
  claimTypeId: "type-1",
  claimTypeCode: "TRAVEL",
  claimTypeName: "Travel",
  claimDate: "2026-03-01",
  amount: "120.00",
  currency: "MYR",
  description: null,
  state: "submitted",
  submittedAt: new Date("2026-03-01T00:00:00.000Z"),
  submittedByUserId: null,
  currentApprovalId: null,
  decidedByUserId: null,
  decidedAt: null,
  rejectedReason: null,
  paidByPayrollLineId: null,
  paidAt: null,
  cancelledAt: null,
  evidenceCount: 1,
  requiresEvidence: false,
  policyEvidenceRequired: null,
  payoutMethod: "payroll",
  financeAccountCode: null,
  costCenterCode: null,
  projectCode: null,
  taxTreatment: "default",
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
} as const satisfies ClaimRow

const ADVANCE_ROW = {
  id: "adv-1",
  employeeId: "emp-1",
  employeeLegalName: "Alex Example",
  amount: "500",
  currency: "MYR",
  state: "pending",
  requestedAt: new Date("2026-03-01T00:00:00.000Z"),
  reason: "Emergency",
} as const satisfies SalaryAdvanceListRow

const TRAINING_ASSIGNMENT = {
  id: "assign-1",
  courseId: "course-1",
  courseCode: "SAFE-101",
  courseName: "Safety",
  sessionId: null,
  sessionTitle: null,
  employeeId: "emp-1",
  employeeNumber: "E001",
  employeeName: "Alex Example",
  assignedAt: new Date("2026-03-15T00:00:00.000Z"),
  dueAt: new Date("2026-04-01T00:00:00.000Z"),
  required: true,
  state: "assigned",
  attendance: null,
  priority: "normal",
  sourceKind: "manual",
} as const satisfies HrmTrainingAssignmentRow

const TRAINING_RECORD = {
  id: "record-1",
  organizationId: "org-1",
  assignmentId: null,
  sessionId: null,
  courseId: "course-1",
  courseCode: "SAFE-101",
  courseName: "Safety",
  employeeId: "emp-1",
  employeeNumber: "E001",
  employeeName: "Alex Example",
  completedAt: new Date("2026-02-01T00:00:00.000Z"),
  expiresAt: null,
  verificationState: "verified",
  statutoryFlag: false,
  statutoryAuthorityCode: null,
  recertificationIntervalMonths: null,
  certificateDocumentId: null,
  feedbackRating: null,
  feedbackText: null,
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
