import "server-only"

import { and, desc, eq, inArray, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceEvent,
  hrmBoardingInstance,
  hrmOffboardingInstance,
  hrmTrainingAssignment,
  hrmTrainingCourse,
} from "#lib/db/schema"
import { listClaimsForEmployee } from "../../../payroll-compensation/expenses-reimbursement/data/claim.queries.server"
import { listLeaveRequestsForEmployee } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { listSalaryAdvancesForEmployee } from "../../../payroll-compensation/payroll-processing/data/salary-advance.queries.server"
import { listEnrollmentsForEmployee } from "../../../payroll-compensation/benefits-administration/data/benefit.queries.server"
import { listPendingSignaturePartiesForEmployee } from "#features/tools/server"
import { listEmployeeProfileUpdateRequests } from "./employee-portal-profile-request.queries.server"
import { listEmployeeDocumentRequests } from "./employee-portal-document-request.queries.server"

export type EmployeePortalOpenRequestKind =
  | "leave"
  | "claim"
  | "salary_advance"
  | "benefit_enrollment"
  | "signature"
  | "profile_update"
  | "document_request"
  | "attendance_correction"
  | "training"
  | "onboarding_task"
  | "offboarding_task"

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
const OPEN_ESS_REQUEST_STATES = new Set(["pending", "returned"])
const OPEN_TRAINING_STATES = ["assigned", "overdue"] as const
const OPEN_BOARDING_STATES = ["pending", "in_progress", "open"] as const

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

  const [
    leaveRows,
    claimRows,
    advanceRows,
    benefitRows,
    signatureRows,
    profileUpdateRows,
    documentRequestRows,
    attendanceCorrectionRows,
    trainingRows,
    boardingRows,
    offboardingRows,
  ] = await Promise.all([
    listLeaveRequestsForEmployee(input.organizationId, input.employeeId),
    listClaimsForEmployee(input.organizationId, input.employeeId, {
      limit,
    }),
    listSalaryAdvancesForEmployee(input.organizationId, input.employeeId, limit),
    listEnrollmentsForEmployee(input.organizationId, input.employeeId),
    listPendingSignaturePartiesForEmployee(
      input.organizationId,
      input.employeeId
    ),
    listEmployeeProfileUpdateRequests({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      limit,
    }),
    listEmployeeDocumentRequests({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      limit,
    }),
    db
      .select({
        id: hrmAttendanceEvent.id,
        correctionReason: hrmAttendanceEvent.correctionReason,
        occurredAt: hrmAttendanceEvent.occurredAt,
        createdAt: hrmAttendanceEvent.createdAt,
      })
      .from(hrmAttendanceEvent)
      .where(
        and(
          eq(hrmAttendanceEvent.organizationId, input.organizationId),
          eq(hrmAttendanceEvent.employeeId, input.employeeId),
          isNotNull(hrmAttendanceEvent.correctionOfEventId)
        )
      )
      .orderBy(desc(hrmAttendanceEvent.createdAt))
      .limit(limit),
    db
      .select({
        id: hrmTrainingAssignment.id,
        state: hrmTrainingAssignment.state,
        assignedAt: hrmTrainingAssignment.assignedAt,
        dueAt: hrmTrainingAssignment.dueAt,
        courseName: hrmTrainingCourse.name,
      })
      .from(hrmTrainingAssignment)
      .innerJoin(
        hrmTrainingCourse,
        eq(hrmTrainingCourse.id, hrmTrainingAssignment.courseId)
      )
      .where(
        and(
          eq(hrmTrainingAssignment.organizationId, input.organizationId),
          eq(hrmTrainingAssignment.employeeId, input.employeeId),
          inArray(hrmTrainingAssignment.state, [...OPEN_TRAINING_STATES])
        )
      )
      .orderBy(desc(hrmTrainingAssignment.assignedAt))
      .limit(limit),
    db
      .select({
        id: hrmBoardingInstance.id,
        kind: hrmBoardingInstance.kind,
        status: hrmBoardingInstance.status,
        createdAt: hrmBoardingInstance.createdAt,
      })
      .from(hrmBoardingInstance)
      .where(
        and(
          eq(hrmBoardingInstance.organizationId, input.organizationId),
          eq(hrmBoardingInstance.employeeId, input.employeeId),
          inArray(hrmBoardingInstance.status, [...OPEN_BOARDING_STATES])
        )
      )
      .orderBy(desc(hrmBoardingInstance.createdAt))
      .limit(limit),
    db
      .select({
        id: hrmOffboardingInstance.id,
        status: hrmOffboardingInstance.status,
        updatedAt: hrmOffboardingInstance.updatedAt,
      })
      .from(hrmOffboardingInstance)
      .where(
        and(
          eq(hrmOffboardingInstance.organizationId, input.organizationId),
          eq(hrmOffboardingInstance.employeeId, input.employeeId),
          inArray(hrmOffboardingInstance.status, [...OPEN_BOARDING_STATES])
        )
      )
      .orderBy(desc(hrmOffboardingInstance.updatedAt))
      .limit(limit),
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

  for (const request of profileUpdateRows) {
    if (!OPEN_ESS_REQUEST_STATES.has(request.status)) continue
    rows.push({
      id: request.id,
      kind: "profile_update",
      status: request.status,
      label: `Profile update: ${request.section}`,
      submittedAt: request.createdAt,
    })
  }

  for (const request of documentRequestRows) {
    if (!OPEN_ESS_REQUEST_STATES.has(request.status)) continue
    rows.push({
      id: request.id,
      kind: "document_request",
      status: request.status,
      label: request.title,
      submittedAt: request.submittedAt,
    })
  }

  for (const correction of attendanceCorrectionRows) {
    rows.push({
      id: correction.id,
      kind: "attendance_correction",
      status: "submitted",
      label: correction.correctionReason ?? "Attendance correction",
      submittedAt: correction.createdAt,
    })
  }

  for (const training of trainingRows) {
    rows.push({
      id: training.id,
      kind: "training",
      status: training.state,
      label: training.courseName,
      submittedAt: training.dueAt ?? training.assignedAt,
    })
  }

  for (const boarding of boardingRows) {
    rows.push({
      id: boarding.id,
      kind: "onboarding_task",
      status: boarding.status,
      label: `${boarding.kind} tasks`,
      submittedAt: boarding.createdAt,
    })
  }

  for (const offboarding of offboardingRows) {
    rows.push({
      id: offboarding.id,
      kind: "offboarding_task",
      status: offboarding.status,
      label: "Offboarding tasks",
      submittedAt: offboarding.updatedAt,
    })
  }

  return rows
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
    .slice(0, limit * 11)
}
