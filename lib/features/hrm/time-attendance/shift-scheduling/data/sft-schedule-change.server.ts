import "server-only"

import { and, asc, desc, eq, gte, lte } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmShiftAssignment,
  hrmShiftScheduleChangeRequest,
  hrmShiftTemplate,
} from "#lib/db/schema"

import { assignOneShift } from "./sft-assign-shift.server"
import { HRM_SFT_AUDIT } from "../sft.contract"
import {
  notifyScheduleChangeResolved,
  notifyShiftAssignmentChanged,
} from "./sft-notification.server"
import { revalidateSftSurfaces } from "./sft-revalidate.server"

export type EmployeeScheduleChangeRow = {
  readonly id: string
  readonly state: string
  readonly reason: string
  readonly rejectedReason: string | null
  readonly proposedDate: string
  readonly proposedTemplateCode: string
  readonly createdAt: Date
}

export type ScheduleChangeAssignmentChoice = {
  readonly id: string
  readonly label: string
}

export type ScheduleChangeTemplateChoice = {
  readonly id: string
  readonly label: string
}

export type ScheduleChangeRequestRow = {
  readonly id: string
  readonly requesterEmployeeId: string
  readonly requesterName: string | null
  readonly assignmentId: string
  readonly proposedTemplateId: string
  readonly proposedTemplateCode: string
  readonly proposedDate: string
  readonly reason: string
  readonly state: string
}

export async function listPendingScheduleChangeRequests(input: {
  organizationId: string
}): Promise<ScheduleChangeRequestRow[]> {
  const rows = await db
    .select({
      id: hrmShiftScheduleChangeRequest.id,
      requesterEmployeeId: hrmShiftScheduleChangeRequest.requesterEmployeeId,
      requesterName: hrmEmployee.legalName,
      assignmentId: hrmShiftScheduleChangeRequest.assignmentId,
      proposedTemplateId: hrmShiftScheduleChangeRequest.proposedTemplateId,
      proposedTemplateCode: hrmShiftTemplate.code,
      proposedDate: hrmShiftScheduleChangeRequest.proposedDate,
      reason: hrmShiftScheduleChangeRequest.reason,
      state: hrmShiftScheduleChangeRequest.state,
    })
    .from(hrmShiftScheduleChangeRequest)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmShiftScheduleChangeRequest.requesterEmployeeId),
        eq(
          hrmEmployee.organizationId,
          hrmShiftScheduleChangeRequest.organizationId
        )
      )
    )
    .innerJoin(
      hrmShiftTemplate,
      eq(hrmShiftTemplate.id, hrmShiftScheduleChangeRequest.proposedTemplateId)
    )
    .where(
      and(
        eq(hrmShiftScheduleChangeRequest.organizationId, input.organizationId),
        eq(hrmShiftScheduleChangeRequest.state, "submitted")
      )
    )
    .orderBy(asc(hrmShiftScheduleChangeRequest.createdAt))

  return rows
}

export async function listScheduleChangeRequestsForEmployee(input: {
  organizationId: string
  employeeId: string
}): Promise<EmployeeScheduleChangeRow[]> {
  const rows = await db
    .select({
      id: hrmShiftScheduleChangeRequest.id,
      state: hrmShiftScheduleChangeRequest.state,
      reason: hrmShiftScheduleChangeRequest.reason,
      rejectedReason: hrmShiftScheduleChangeRequest.rejectedReason,
      proposedDate: hrmShiftScheduleChangeRequest.proposedDate,
      proposedTemplateCode: hrmShiftTemplate.code,
      createdAt: hrmShiftScheduleChangeRequest.createdAt,
    })
    .from(hrmShiftScheduleChangeRequest)
    .innerJoin(
      hrmShiftTemplate,
      eq(hrmShiftTemplate.id, hrmShiftScheduleChangeRequest.proposedTemplateId)
    )
    .where(
      and(
        eq(hrmShiftScheduleChangeRequest.organizationId, input.organizationId),
        eq(hrmShiftScheduleChangeRequest.requesterEmployeeId, input.employeeId)
      )
    )
    .orderBy(desc(hrmShiftScheduleChangeRequest.createdAt))
    .limit(50)

  return rows
}

export async function listScheduleChangeChoicesForEmployee(input: {
  organizationId: string
  employeeId: string
  rangeStart: string
  rangeEnd: string
}): Promise<{
  assignments: ScheduleChangeAssignmentChoice[]
  templates: ScheduleChangeTemplateChoice[]
}> {
  const [assignmentRows, templateRows] = await Promise.all([
    db
      .select({
        id: hrmShiftAssignment.id,
        attendanceDate: hrmShiftAssignment.attendanceDate,
        templateCode: hrmShiftAssignment.templateCode,
      })
      .from(hrmShiftAssignment)
      .where(
        and(
          eq(hrmShiftAssignment.organizationId, input.organizationId),
          eq(hrmShiftAssignment.employeeId, input.employeeId),
          gte(hrmShiftAssignment.attendanceDate, input.rangeStart),
          lte(hrmShiftAssignment.attendanceDate, input.rangeEnd)
        )
      )
      .orderBy(asc(hrmShiftAssignment.attendanceDate)),
    db
      .select({
        id: hrmShiftTemplate.id,
        code: hrmShiftTemplate.code,
        name: hrmShiftTemplate.name,
      })
      .from(hrmShiftTemplate)
      .where(
        and(
          eq(hrmShiftTemplate.organizationId, input.organizationId),
          eq(hrmShiftTemplate.isActive, true)
        )
      )
      .orderBy(asc(hrmShiftTemplate.code)),
  ])

  return {
    assignments: assignmentRows.map((row) => ({
      id: row.id,
      label: `${row.attendanceDate} · ${row.templateCode}`,
    })),
    templates: templateRows.map((row) => ({
      id: row.id,
      label: `${row.code} · ${row.name}`,
    })),
  }
}

export async function submitScheduleChangeRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requesterEmployeeId: string
  assignmentId: string
  proposedTemplateId: string
  proposedDate: string
  reason: string
}): Promise<{ ok: true; requestId: string } | { ok: false; error: string }> {
  const assignmentRows = await db
    .select({
      id: hrmShiftAssignment.id,
      employeeId: hrmShiftAssignment.employeeId,
    })
    .from(hrmShiftAssignment)
    .where(
      and(
        eq(hrmShiftAssignment.organizationId, input.organizationId),
        eq(hrmShiftAssignment.id, input.assignmentId),
        eq(hrmShiftAssignment.employeeId, input.requesterEmployeeId)
      )
    )
    .limit(1)

  if (!assignmentRows[0]) {
    return { ok: false, error: "Assignment not found for this employee." }
  }

  const requestId = crypto.randomUUID()
  await db.insert(hrmShiftScheduleChangeRequest).values({
    id: requestId,
    organizationId: input.organizationId,
    requesterEmployeeId: input.requesterEmployeeId,
    assignmentId: input.assignmentId,
    proposedTemplateId: input.proposedTemplateId,
    proposedDate: input.proposedDate,
    reason: input.reason,
    state: "submitted",
    createdByUserId: input.userId,
    updatedByUserId: input.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.scheduleChangeSubmit,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_schedule_change_request",
    resourceId: requestId,
    metadata: {
      assignmentId: input.assignmentId,
      proposedDate: input.proposedDate,
    },
  })

  revalidateSftSurfaces()
  return { ok: true, requestId }
}

export async function approveScheduleChangeRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requestId: string
  managerNote?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db
    .select()
    .from(hrmShiftScheduleChangeRequest)
    .where(
      and(
        eq(hrmShiftScheduleChangeRequest.organizationId, input.organizationId),
        eq(hrmShiftScheduleChangeRequest.id, input.requestId)
      )
    )
    .limit(1)
  const request = rows[0]

  if (!request || request.state !== "submitted") {
    return { ok: false, error: "Schedule change request is not pending." }
  }

  const assignResult = await assignOneShift({
    organizationId: input.organizationId,
    userId: input.userId,
    employeeId: request.requesterEmployeeId,
    attendanceDate: request.proposedDate,
    shiftTemplateId: request.proposedTemplateId,
  })

  if (!assignResult.ok) {
    const message =
      assignResult.errors.form ??
      assignResult.errors.shiftTemplateId ??
      "Could not apply schedule change."
    return { ok: false, error: message }
  }

  const now = new Date()
  await db
    .update(hrmShiftScheduleChangeRequest)
    .set({
      state: "approved",
      managerNote: input.managerNote ?? null,
      updatedByUserId: input.userId,
      updatedAt: now,
    })
    .where(eq(hrmShiftScheduleChangeRequest.id, request.id))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.scheduleChangeApprove,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_schedule_change_request",
    resourceId: request.id,
    metadata: { managerNote: input.managerNote ?? null },
  })

  const templateRows = await db
    .select({ code: hrmShiftTemplate.code })
    .from(hrmShiftTemplate)
    .where(eq(hrmShiftTemplate.id, request.proposedTemplateId))
    .limit(1)

  await notifyScheduleChangeResolved({
    organizationId: input.organizationId,
    requestId: request.id,
    requesterEmployeeId: request.requesterEmployeeId,
    outcome: "approved",
    proposedDate: request.proposedDate,
    proposedTemplateCode: templateRows[0]?.code,
    managerNote: input.managerNote ?? null,
  })

  await notifyShiftAssignmentChanged({
    organizationId: input.organizationId,
    assignmentId: assignResult.assignmentId,
    employeeId: request.requesterEmployeeId,
    attendanceDate: request.proposedDate,
    templateName: assignResult.templateName,
  })

  revalidateSftSurfaces()
  return { ok: true }
}

export async function rejectScheduleChangeRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requestId: string
  rejectedReason: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db
    .select()
    .from(hrmShiftScheduleChangeRequest)
    .where(
      and(
        eq(hrmShiftScheduleChangeRequest.organizationId, input.organizationId),
        eq(hrmShiftScheduleChangeRequest.id, input.requestId)
      )
    )
    .limit(1)
  const request = rows[0]

  if (!request || request.state !== "submitted") {
    return { ok: false, error: "Schedule change request is not pending." }
  }

  const now = new Date()
  await db
    .update(hrmShiftScheduleChangeRequest)
    .set({
      state: "rejected",
      rejectedReason: input.rejectedReason,
      updatedByUserId: input.userId,
      updatedAt: now,
    })
    .where(eq(hrmShiftScheduleChangeRequest.id, request.id))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.scheduleChangeReject,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_schedule_change_request",
    resourceId: request.id,
    metadata: { rejectedReason: input.rejectedReason },
  })

  const templateRows = await db
    .select({ code: hrmShiftTemplate.code })
    .from(hrmShiftTemplate)
    .where(eq(hrmShiftTemplate.id, request.proposedTemplateId))
    .limit(1)

  await notifyScheduleChangeResolved({
    organizationId: input.organizationId,
    requestId: request.id,
    requesterEmployeeId: request.requesterEmployeeId,
    outcome: "rejected",
    proposedDate: request.proposedDate,
    proposedTemplateCode: templateRows[0]?.code,
  })

  revalidateSftSurfaces()
  return { ok: true }
}

export async function returnScheduleChangeRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  requestId: string
  returnedReason: string
  managerNote?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db
    .select()
    .from(hrmShiftScheduleChangeRequest)
    .where(
      and(
        eq(hrmShiftScheduleChangeRequest.organizationId, input.organizationId),
        eq(hrmShiftScheduleChangeRequest.id, input.requestId)
      )
    )
    .limit(1)
  const request = rows[0]

  if (!request || request.state !== "submitted") {
    return { ok: false, error: "Schedule change request is not pending." }
  }

  const now = new Date()
  await db
    .update(hrmShiftScheduleChangeRequest)
    .set({
      state: "returned",
      rejectedReason: input.returnedReason,
      managerNote: input.managerNote ?? null,
      updatedByUserId: input.userId,
      updatedAt: now,
    })
    .where(eq(hrmShiftScheduleChangeRequest.id, request.id))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.scheduleChangeReturn,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_shift_schedule_change_request",
    resourceId: request.id,
    metadata: { returnedReason: input.returnedReason },
  })

  const templateRows = await db
    .select({ code: hrmShiftTemplate.code })
    .from(hrmShiftTemplate)
    .where(eq(hrmShiftTemplate.id, request.proposedTemplateId))
    .limit(1)

  await notifyScheduleChangeResolved({
    organizationId: input.organizationId,
    requestId: request.id,
    requesterEmployeeId: request.requesterEmployeeId,
    outcome: "returned",
    proposedDate: request.proposedDate,
    proposedTemplateCode: templateRows[0]?.code,
    managerNote: input.managerNote ?? null,
  })

  revalidateSftSurfaces()
  return { ok: true }
}
