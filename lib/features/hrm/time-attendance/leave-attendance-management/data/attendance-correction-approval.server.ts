import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval } from "#lib/db/schema"

import { HRM_LAM_AUDIT } from "../hrm-lam.contract"
import type { CorrectAttendanceEventInput } from "../schemas/attendance-event.schema"
import { applyAttendanceEventCorrection } from "./attendance-correction-mutation.server"
import { resolveLeaveApproverUserId } from "./leave-request.queries.server"
import type { AttendanceCorrectionFormState } from "../../../types"

export type AttendanceCorrectionApprovalSnapshot = {
  readonly correction: CorrectAttendanceEventInput
  readonly originalEmployeeId: string
}

export async function submitAttendanceCorrectionForApproval(input: {
  readonly organizationId: string
  readonly userId: string
  readonly sessionId: string | null
  readonly employeeId: string
  readonly correction: CorrectAttendanceEventInput
  readonly managerEmployeeId: string | null
}): Promise<AttendanceCorrectionFormState> {
  const approvalId = crypto.randomUUID()
  const currentApproverUserId = await resolveLeaveApproverUserId({
    organizationId: input.organizationId,
    managerEmployeeId: input.managerEmployeeId,
  })

  const snapshot: AttendanceCorrectionApprovalSnapshot = {
    correction: input.correction,
    originalEmployeeId: input.employeeId,
  }

  await db.insert(hrmApproval).values({
    id: approvalId,
    organizationId: input.organizationId,
    subjectKind: "attendance_correction",
    subjectId: input.correction.originalEventId,
    state: "pending",
    requestedByUserId: input.userId,
    currentApproverUserId,
    snapshot,
    createdByUserId: input.userId,
    updatedByUserId: input.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_LAM_AUDIT.attendance.correctionSubmit,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: {
      subjectKind: "attendance_correction",
      originalEventId: input.correction.originalEventId,
      employeeId: input.employeeId,
      currentApproverUserId,
    },
  })

  return { ok: true, correctionEventId: approvalId }
}

export async function approveAttendanceCorrectionApproval(input: {
  readonly organizationId: string
  readonly userId: string
  readonly sessionId: string | null
  readonly approvalId: string
}): Promise<AttendanceCorrectionFormState> {
  const approval = await db.query.hrmApproval.findFirst({
    where: and(
      eq(hrmApproval.id, input.approvalId),
      eq(hrmApproval.organizationId, input.organizationId),
      eq(hrmApproval.subjectKind, "attendance_correction")
    ),
  })

  if (!approval || approval.state !== "pending") {
    return { ok: false, errors: { form: "Correction approval not found." } }
  }

  const snapshot = approval.snapshot as AttendanceCorrectionApprovalSnapshot | null
  if (!snapshot?.correction) {
    return { ok: false, errors: { form: "Correction snapshot is invalid." } }
  }

  const result = await applyAttendanceEventCorrection({
    organizationId: input.organizationId,
    userId: input.userId,
    sessionId: input.sessionId,
    data: snapshot.correction,
    restrictToEmployeeId: null,
  })

  if (!result.ok) {
    return result
  }

  const now = new Date()
  await db
    .update(hrmApproval)
    .set({
      state: "approved",
      decisionByUserId: input.userId,
      decisionAt: now,
      updatedAt: now,
      updatedByUserId: input.userId,
    })
    .where(eq(hrmApproval.id, input.approvalId))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_LAM_AUDIT.approval.approve,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_approval",
    resourceId: input.approvalId,
    metadata: { subjectKind: "attendance_correction" },
  })

  return result
}
