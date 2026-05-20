import "server-only"

import { and, eq, inArray, isNotNull, lt } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmLeaveRequest,
  hrmLeaveType,
  iamAuditEvent,
} from "#lib/db/schema"
import type {
  CronTickInput,
  CronTickScannedEmittedSummary,
} from "#lib/erp/cron-tick.shared"

import { HRM_LAM_LEAVE_EVENT_TYPES } from "../hrm-lam.contract"
import { notifyLeaveLifecycle } from "./leave-notification.server"

/** Calendar days in `submitted` before overdue signal. */
export const LEAVE_APPROVAL_OVERDUE_DAYS = 5

const OVERDUE_WATCH_BATCH_LIMIT = 200

export type LeaveOverdueWatchTickSummary = CronTickScannedEmittedSummary & {
  readonly skippedAlreadyAudited: number
  readonly notificationsSent: number
}

type OverdueCandidate = {
  readonly requestId: string
  readonly organizationId: string
  readonly leaveTypeCode: string
  readonly startDate: string
  readonly endDate: string
  readonly requestedAt: Date
  readonly currentApproverUserId: string | null
}

export async function runLeaveApprovalOverdueTick(
  input?: CronTickInput
): Promise<LeaveOverdueWatchTickSummary> {
  const now = input?.now ?? new Date()
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - LEAVE_APPROVAL_OVERDUE_DAYS)

  const rows = await db
    .select({
      requestId: hrmLeaveRequest.id,
      organizationId: hrmLeaveRequest.organizationId,
      leaveTypeCode: hrmLeaveType.code,
      startDate: hrmLeaveRequest.startDate,
      endDate: hrmLeaveRequest.endDate,
      requestedAt: hrmLeaveRequest.requestedAt,
      currentApproverUserId: hrmApproval.currentApproverUserId,
    })
    .from(hrmLeaveRequest)
    .innerJoin(hrmLeaveType, eq(hrmLeaveType.id, hrmLeaveRequest.leaveTypeId))
    .leftJoin(
      hrmApproval,
      eq(hrmApproval.id, hrmLeaveRequest.currentApprovalId)
    )
    .where(
      and(
        eq(hrmLeaveRequest.state, "submitted"),
        isNotNull(hrmLeaveRequest.requestedAt),
        lt(hrmLeaveRequest.requestedAt, cutoff)
      )
    )
    .limit(input?.batchLimit ?? OVERDUE_WATCH_BATCH_LIMIT)

  if (rows.length === 0) {
    return {
      scanned: 0,
      emitted: 0,
      skippedAlreadyAudited: 0,
      notificationsSent: 0,
    }
  }

  const candidates: OverdueCandidate[] = rows.map((row) => ({
    requestId: row.requestId,
    organizationId: row.organizationId,
    leaveTypeCode: row.leaveTypeCode,
    startDate: row.startDate,
    endDate: row.endDate,
    requestedAt: row.requestedAt!,
    currentApproverUserId: row.currentApproverUserId,
  }))

  const requestIds = candidates.map((c) => c.requestId)
  const emittedRows = await db
    .selectDistinct({ resourceId: iamAuditEvent.resourceId })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.action, HRM_LAM_LEAVE_EVENT_TYPES.overdue),
        inArray(iamAuditEvent.resourceId, requestIds)
      )
    )

  const alreadyAudited = new Set(emittedRows.map((r) => r.resourceId))
  let emitted = 0
  let skippedAlreadyAudited = 0
  let notificationsSent = 0

  for (const candidate of candidates) {
    if (alreadyAudited.has(candidate.requestId)) {
      skippedAlreadyAudited += 1
      continue
    }

    await writeIamAuditEvent({
      action: HRM_LAM_LEAVE_EVENT_TYPES.overdue,
      actorUserId: null,
      actorSessionId: null,
      organizationId: candidate.organizationId,
      resourceType: "hrm_leave_request",
      resourceId: candidate.requestId,
      metadata: {
        leaveTypeCode: candidate.leaveTypeCode,
        startDate: candidate.startDate,
        endDate: candidate.endDate,
        requestedAt: candidate.requestedAt.toISOString(),
        currentApproverUserId: candidate.currentApproverUserId,
      },
    })

    emitted += 1

    if (candidate.currentApproverUserId) {
      await notifyLeaveLifecycle({
        organizationId: candidate.organizationId,
        requestId: candidate.requestId,
        event: "overdue",
        targetUserId: candidate.currentApproverUserId,
        leaveTypeCode: candidate.leaveTypeCode,
        startDate: candidate.startDate,
        endDate: candidate.endDate,
      })
      notificationsSent += 1
    }
  }

  return {
    scanned: candidates.length,
    emitted,
    skippedAlreadyAudited,
    notificationsSent,
  }
}
