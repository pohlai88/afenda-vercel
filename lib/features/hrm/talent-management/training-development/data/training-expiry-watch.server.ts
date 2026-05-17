import "server-only"

import { and, eq, isNotNull, lte } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { hrmTrainingAssignment, hrmTrainingRecord } from "#lib/db/schema"
import type { CronTickScannedEmittedSummary } from "#lib/erp/cron-tick.shared"

import { assignTrainingInTransaction } from "./training-assignment.mutations.server"
import {
  loadTrainingCourseName,
  notifyTrainingCertificationExpiring,
  resolveEmployeePortalNotificationContext,
} from "./training-notification.server"
import { appendTrainingEvent } from "./training-event-log.server"
import {
  buildRecertificationSourceReference,
  classifyRecertificationDueBand,
  isRecertificationAssignmentDuplicate,
} from "./training-recertification.server"
import { HRM_TRAINING_AUDIT } from "../training.contract"

export type TrainingExpiryWatchTickSummary = CronTickScannedEmittedSummary & {
  readonly reassigned: number
  readonly expiredBands: Readonly<Record<string, number>>
}

const WATCH_BATCH_LIMIT = 200

export async function runTrainingExpiryWatchTick(): Promise<TrainingExpiryWatchTickSummary> {
  const now = new Date()
  const horizon = new Date(now)
  horizon.setUTCDate(horizon.getUTCDate() + 90)

  const records = await db
    .select({
      id: hrmTrainingRecord.id,
      organizationId: hrmTrainingRecord.organizationId,
      employeeId: hrmTrainingRecord.employeeId,
      courseId: hrmTrainingRecord.courseId,
      completedAt: hrmTrainingRecord.completedAt,
      expiresAt: hrmTrainingRecord.expiresAt,
    })
    .from(hrmTrainingRecord)
    .where(
      and(
        isNotNull(hrmTrainingRecord.expiresAt),
        lte(hrmTrainingRecord.expiresAt, horizon)
      )
    )
    .limit(WATCH_BATCH_LIMIT)

  let scanned = 0
  let emitted = 0
  let reassigned = 0
  const expiredBands: Record<string, number> = {
    expired: 0,
    "30": 0,
    "60": 0,
    "90": 0,
  }

  for (const record of records) {
    if (!record.expiresAt) continue
    scanned += 1

    const band = classifyRecertificationDueBand(record.expiresAt, now)
    if (!band) continue

    expiredBands[band] = (expiredBands[band] ?? 0) + 1

    const sourceReference = buildRecertificationSourceReference(record)

    const [openAssignment] = await db
      .select({
        id: hrmTrainingAssignment.id,
        sourceReference: hrmTrainingAssignment.sourceReference,
      })
      .from(hrmTrainingAssignment)
      .where(
        and(
          eq(hrmTrainingAssignment.organizationId, record.organizationId),
          eq(hrmTrainingAssignment.employeeId, record.employeeId),
          eq(hrmTrainingAssignment.courseId, record.courseId),
          eq(hrmTrainingAssignment.sourceKind, "recertification"),
          eq(hrmTrainingAssignment.state, "assigned")
        )
      )
      .limit(1)

    if (
      openAssignment &&
      isRecertificationAssignmentDuplicate({
        existingSourceReference: openAssignment.sourceReference,
        sourceReference,
      })
    ) {
      continue
    }

    if (openAssignment) {
      continue
    }

    const dueAt = new Date(record.expiresAt)
    const assignResult = await assignTrainingInTransaction({
      organizationId: record.organizationId,
      courseId: record.courseId,
      employeeId: record.employeeId,
      dueAt,
      required: true,
      priority: band === "expired" ? "statutory" : "high",
      sourceKind: "recertification",
      sourceReference,
      actorUserId: "system:hrm-training-expiry-watch",
    })

    if (!assignResult.ok) {
      continue
    }

    const assignmentId = assignResult.assignmentId

    if (band === "30") {
      const portalCtx = await resolveEmployeePortalNotificationContext(
        record.organizationId
      )
      if (portalCtx) {
        const courseName = await loadTrainingCourseName(
          record.organizationId,
          record.courseId
        )
        notifyTrainingCertificationExpiring({
          locale: portalCtx.locale,
          portalSlug: portalCtx.portalSlug,
          organizationId: record.organizationId,
          employeeId: record.employeeId,
          courseName,
          expiresAt: record.expiresAt,
        })
      }
    }

    await appendTrainingEvent({
      organizationId: record.organizationId,
      action: band === "expired" ? "expired" : "reassigned",
      employeeId: record.employeeId,
      actorUserId: null,
      assignmentId,
      recordId: record.id,
      payload: { band, sourceReference },
    })

    await writeIamAuditEvent({
      action: HRM_TRAINING_AUDIT.recertification.create,
      actorUserId: null,
      actorSessionId: null,
      organizationId: record.organizationId,
      resourceType: "hrm_training_assignment",
      resourceId: assignmentId,
      metadata: {
        recordId: record.id,
        band,
        sourceReference,
      },
    })

    emitted += 1
    reassigned += 1
  }

  return { scanned, emitted, reassigned, expiredBands }
}
