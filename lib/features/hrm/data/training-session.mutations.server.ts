import "server-only"

import { and, eq, isNotNull, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmTrainingAssignment,
  hrmTrainingRecord,
  hrmTrainingSession,
} from "#lib/db/schema"

import { computeTrainingExpiresAtDate } from "./training-recertification.server"
import {
  getTrainingCourseById,
  getTrainingSessionById,
} from "./training.queries.server"

export type TrainingSessionRecordOutcome = {
  readonly recordId: string
  readonly employeeId: string
  readonly courseId: string
  readonly certificateDocumentId: string | null
}

export type CloseTrainingSessionResult =
  | {
      ok: true
      sessionId: string
      recordIds: string[]
      recordOutcomes: TrainingSessionRecordOutcome[]
      skippedAbsent: number
    }
  | { ok: false; message: string }

export async function closeTrainingSessionInTransaction(input: {
  readonly organizationId: string
  readonly sessionId: string
  readonly actorUserId: string
}): Promise<CloseTrainingSessionResult> {
  const session = await getTrainingSessionById(
    input.organizationId,
    input.sessionId
  )
  if (!session) {
    return { ok: false, message: "Training session not found." }
  }
  if (session.state === "completed") {
    return { ok: false, message: "Training session is already closed." }
  }
  if (session.state === "cancelled") {
    return { ok: false, message: "Cancelled sessions cannot be closed." }
  }

  const course = await getTrainingCourseById(
    input.organizationId,
    session.courseId
  )
  if (!course) {
    return { ok: false, message: "Training course not found." }
  }

  const durationMs =
    session.scheduledEndAt.getTime() - session.scheduledStartAt.getTime()
  const hoursCompleted = Math.max(0, durationMs / 3_600_000).toFixed(2)

  return db.transaction(async (tx) => {
    const roster = await tx
      .select()
      .from(hrmTrainingAssignment)
      .where(
        and(
          eq(hrmTrainingAssignment.organizationId, input.organizationId),
          eq(hrmTrainingAssignment.sessionId, input.sessionId),
          eq(hrmTrainingAssignment.state, "assigned")
        )
      )

    const recordIds: string[] = []
    const recordOutcomes: TrainingSessionRecordOutcome[] = []
    let skippedAbsent = 0
    const now = new Date()

    for (const assignment of roster) {
      if (assignment.attendance !== "present") {
        skippedAbsent += 1
        continue
      }

      const completedAt = new Date(session.scheduledEndAt)
      const expiresAt = computeTrainingExpiresAtDate(
        completedAt,
        course.recertificationIntervalMonths
      )

      const [record] = await tx
        .insert(hrmTrainingRecord)
        .values({
          organizationId: input.organizationId,
          assignmentId: assignment.id,
          sessionId: input.sessionId,
          courseId: session.courseId,
          employeeId: assignment.employeeId,
          completedAt,
          expiresAt,
          instructor: session.trainerName,
          hoursCompleted,
          creditUnits: course.defaultCreditUnits,
          verificationState: "hr_verified",
          verifiedByUserId: input.actorUserId,
          verifiedAt: now,
          createdByUserId: input.actorUserId,
          updatedByUserId: input.actorUserId,
        })
        .returning({ id: hrmTrainingRecord.id })

      if (record) {
        recordIds.push(record.id)
        recordOutcomes.push({
          recordId: record.id,
          employeeId: assignment.employeeId,
          courseId: session.courseId,
          certificateDocumentId: null,
        })
      }

      await tx
        .update(hrmTrainingAssignment)
        .set({
          state: "completed",
          updatedAt: now,
          updatedByUserId: input.actorUserId,
        })
        .where(eq(hrmTrainingAssignment.id, assignment.id))
    }

    await tx
      .update(hrmTrainingSession)
      .set({
        state: "completed",
        closedAt: now,
        closedByUserId: input.actorUserId,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmTrainingSession.id, input.sessionId))

    return {
      ok: true,
      sessionId: input.sessionId,
      recordIds,
      recordOutcomes,
      skippedAbsent,
    }
  })
}

export async function markOverdueTrainingAssignments(
  organizationId: string
): Promise<number> {
  const now = new Date()
  const result = await db
    .update(hrmTrainingAssignment)
    .set({ state: "overdue", updatedAt: now })
    .where(
      and(
        eq(hrmTrainingAssignment.organizationId, organizationId),
        eq(hrmTrainingAssignment.state, "assigned"),
        isNotNull(hrmTrainingAssignment.dueAt),
        lte(hrmTrainingAssignment.dueAt, now)
      )
    )
  return result.rowCount ?? 0
}
