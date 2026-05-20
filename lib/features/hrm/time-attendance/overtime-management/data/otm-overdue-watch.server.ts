import "server-only"

import { and, eq, inArray, isNotNull, lt } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmOvertimeRequest, iamAuditEvent } from "#lib/db/schema"
import type {
  CronTickInput,
  CronTickScannedEmittedSummary,
} from "#lib/erp/cron-tick.shared"

import { HRM_OTM_AUDIT } from "../otm.contract"
import { notifyOtmLifecycle } from "./otm-notification.server"

export const OTM_APPROVAL_OVERDUE_DAYS = 5

const OVERDUE_WATCH_BATCH_LIMIT = 200

export type OtmOverdueWatchTickSummary = CronTickScannedEmittedSummary & {
  readonly skippedAlreadyAudited: number
  readonly notificationsSent: number
}

type OverdueCandidate = {
  readonly requestId: string
  readonly organizationId: string
  readonly workDate: string
  readonly requestedAt: Date
  readonly currentApproverUserId: string | null
}

export async function runOtmApprovalOverdueTick(
  input?: CronTickInput
): Promise<OtmOverdueWatchTickSummary> {
  const now = input?.now ?? new Date()
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - OTM_APPROVAL_OVERDUE_DAYS)

  const rows = await db
    .select({
      requestId: hrmOvertimeRequest.id,
      organizationId: hrmOvertimeRequest.organizationId,
      workDate: hrmOvertimeRequest.workDate,
      requestedAt: hrmOvertimeRequest.requestedAt,
      currentApproverUserId: hrmApproval.currentApproverUserId,
    })
    .from(hrmOvertimeRequest)
    .leftJoin(
      hrmApproval,
      eq(hrmApproval.id, hrmOvertimeRequest.currentApprovalId)
    )
    .where(
      and(
        eq(hrmOvertimeRequest.state, "submitted"),
        isNotNull(hrmOvertimeRequest.requestedAt),
        lt(hrmOvertimeRequest.requestedAt, cutoff)
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
    workDate: row.workDate,
    requestedAt: row.requestedAt,
    currentApproverUserId: row.currentApproverUserId,
  }))

  const requestIds = candidates.map((c) => c.requestId)
  const emittedRows = await db
    .selectDistinct({ resourceId: iamAuditEvent.resourceId })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.action, HRM_OTM_AUDIT.requestOverdue),
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
      action: HRM_OTM_AUDIT.requestOverdue,
      actorUserId: null,
      actorSessionId: null,
      organizationId: candidate.organizationId,
      resourceType: "hrm_overtime_request",
      resourceId: candidate.requestId,
      metadata: {
        workDate: candidate.workDate,
        requestedAt: candidate.requestedAt.toISOString(),
        currentApproverUserId: candidate.currentApproverUserId,
      },
    })

    emitted += 1

    if (candidate.currentApproverUserId) {
      await notifyOtmLifecycle({
        organizationId: candidate.organizationId,
        requestId: candidate.requestId,
        event: "overdue",
        targetUserId: candidate.currentApproverUserId,
        workDate: candidate.workDate,
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
