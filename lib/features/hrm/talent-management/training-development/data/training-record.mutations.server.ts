import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmTrainingAssignment, hrmTrainingRecord } from "#lib/db/schema"

import { isoDateOnlyToUtcDate } from "../../../_module-governance/hrm-calendar-dates.server"
import { computeTrainingExpiresAtDate } from "./training-recertification.server"
import { getTrainingCourseById } from "./training.queries.server"
import { canTransitionTrainingAssignment } from "../schemas/training.schema"

export type CreateTrainingRecordInput = {
  readonly organizationId: string
  readonly assignmentId?: string | null
  readonly sessionId?: string | null
  readonly courseId: string
  readonly employeeId: string
  readonly completedAt: string
  readonly instructor?: string | null
  readonly hoursCompleted?: string | null
  readonly creditUnits?: string | null
  readonly costAmount?: string | null
  readonly costCurrency?: string
  readonly notes?: string | null
  readonly certificateDocumentId?: string | null
  readonly feedbackRating?: number | null
  readonly feedbackText?: string | null
  readonly verificationState:
    | "self_attested"
    | "hr_verified"
    | "external_verified"
  readonly actorUserId: string
}

export async function createTrainingRecordInTransaction(
  input: CreateTrainingRecordInput
): Promise<
  | {
      ok: true
      recordId: string
      courseId: string
      employeeId: string
      completedAt: Date
      expiresAt: Date | null
    }
  | { ok: false; message: string }
> {
  const course = await getTrainingCourseById(
    input.organizationId,
    input.courseId
  )
  if (!course) {
    return { ok: false, message: "Training course not found." }
  }

  const completedAt = isoDateOnlyToUtcDate(input.completedAt)
  const expiresAt = computeTrainingExpiresAtDate(
    completedAt,
    course.recertificationIntervalMonths
  )

  return db.transaction(async (tx) => {
    if (input.assignmentId) {
      const [assignment] = await tx
        .select({ state: hrmTrainingAssignment.state })
        .from(hrmTrainingAssignment)
        .where(
          and(
            eq(hrmTrainingAssignment.organizationId, input.organizationId),
            eq(hrmTrainingAssignment.id, input.assignmentId)
          )
        )
        .limit(1)

      if (!assignment) {
        return { ok: false, message: "Training assignment not found." }
      }

      const from = assignment.state as Parameters<
        typeof canTransitionTrainingAssignment
      >[0]
      if (!canTransitionTrainingAssignment(from, "completed")) {
        return {
          ok: false,
          message: `Assignment cannot be completed from ${from}.`,
        }
      }
    }

    const [record] = await tx
      .insert(hrmTrainingRecord)
      .values({
        organizationId: input.organizationId,
        assignmentId: input.assignmentId ?? null,
        sessionId: input.sessionId ?? null,
        courseId: input.courseId,
        employeeId: input.employeeId,
        completedAt,
        expiresAt,
        instructor: input.instructor?.trim() || null,
        hoursCompleted: input.hoursCompleted ?? course.defaultDurationHours,
        creditUnits: input.creditUnits ?? course.defaultCreditUnits,
        costAmount: input.costAmount ?? null,
        costCurrency: input.costCurrency ?? "MYR",
        notes: input.notes?.trim() || null,
        certificateDocumentId: input.certificateDocumentId ?? null,
        feedbackRating: input.feedbackRating ?? null,
        feedbackText: input.feedbackText?.trim() || null,
        verificationState: input.verificationState,
        verifiedByUserId:
          input.verificationState === "self_attested"
            ? null
            : input.actorUserId,
        verifiedAt:
          input.verificationState === "self_attested" ? null : new Date(),
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .returning({ id: hrmTrainingRecord.id })

    if (input.assignmentId) {
      await tx
        .update(hrmTrainingAssignment)
        .set({
          state: "completed",
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        })
        .where(eq(hrmTrainingAssignment.id, input.assignmentId))
    }

    if (!record?.id) {
      return {
        ok: false,
        message:
          "Failed to create training record — database did not return an ID.",
      }
    }

    return {
      ok: true,
      recordId: record.id,
      courseId: input.courseId,
      employeeId: input.employeeId,
      completedAt,
      expiresAt,
    }
  })
}

export async function verifyTrainingRecordInTransaction(input: {
  readonly organizationId: string
  readonly recordId: string
  readonly actorUserId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [record] = await db
    .select({ verificationState: hrmTrainingRecord.verificationState })
    .from(hrmTrainingRecord)
    .where(
      and(
        eq(hrmTrainingRecord.organizationId, input.organizationId),
        eq(hrmTrainingRecord.id, input.recordId)
      )
    )
    .limit(1)

  if (!record) {
    return { ok: false, message: "Training record not found." }
  }

  if (record.verificationState === "hr_verified") {
    return { ok: true }
  }

  await db
    .update(hrmTrainingRecord)
    .set({
      verificationState: "hr_verified",
      verifiedByUserId: input.actorUserId,
      verifiedAt: new Date(),
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(eq(hrmTrainingRecord.id, input.recordId))

  return { ok: true }
}

export async function updateTrainingRecordFeedback(input: {
  readonly organizationId: string
  readonly recordId: string
  readonly employeeId: string
  readonly feedbackRating: number
  readonly feedbackText?: string | null
  readonly actorUserId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [record] = await db
    .select({
      employeeId: hrmTrainingRecord.employeeId,
    })
    .from(hrmTrainingRecord)
    .where(
      and(
        eq(hrmTrainingRecord.organizationId, input.organizationId),
        eq(hrmTrainingRecord.id, input.recordId)
      )
    )
    .limit(1)

  if (!record) {
    return { ok: false, message: "Training record not found." }
  }

  if (record.employeeId !== input.employeeId) {
    return {
      ok: false,
      message: "You can only submit feedback for your own records.",
    }
  }

  await db
    .update(hrmTrainingRecord)
    .set({
      feedbackRating: input.feedbackRating,
      feedbackText: input.feedbackText?.trim() || null,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(eq(hrmTrainingRecord.id, input.recordId))

  return { ok: true }
}
