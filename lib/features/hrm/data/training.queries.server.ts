import "server-only"

import { and, asc, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmTrainingAssignment,
  hrmTrainingCategory,
  hrmTrainingCourse,
  hrmTrainingRecord,
  hrmTrainingSession,
} from "#lib/db/schema"

import type {
  HrmTrainingAssignmentRow,
  HrmTrainingCategoryRow,
  HrmTrainingCourseRow,
  HrmTrainingRecord,
  HrmTrainingSessionRow,
} from "./training.types.shared"

export async function listTrainingCategoriesForOrg(
  organizationId: string
): Promise<HrmTrainingCategoryRow[]> {
  const rows = await db
    .select({
      id: hrmTrainingCategory.id,
      code: hrmTrainingCategory.code,
      name: hrmTrainingCategory.name,
      description: hrmTrainingCategory.description,
      archivedAt: hrmTrainingCategory.archivedAt,
    })
    .from(hrmTrainingCategory)
    .where(eq(hrmTrainingCategory.organizationId, organizationId))
    .orderBy(asc(hrmTrainingCategory.name))

  return rows
}

export async function listTrainingCoursesForOrg(
  organizationId: string
): Promise<HrmTrainingCourseRow[]> {
  const rows = await db
    .select({
      id: hrmTrainingCourse.id,
      code: hrmTrainingCourse.code,
      name: hrmTrainingCourse.name,
      description: hrmTrainingCourse.description,
      categoryId: hrmTrainingCourse.categoryId,
      categoryName: hrmTrainingCategory.name,
      deliveryMode: hrmTrainingCourse.deliveryMode,
      defaultDurationHours: hrmTrainingCourse.defaultDurationHours,
      defaultCreditUnits: hrmTrainingCourse.defaultCreditUnits,
      statutoryFlag: hrmTrainingCourse.statutoryFlag,
      statutoryAuthorityCode: hrmTrainingCourse.statutoryAuthorityCode,
      recertificationIntervalMonths:
        hrmTrainingCourse.recertificationIntervalMonths,
      defaultRequired: hrmTrainingCourse.defaultRequired,
      grantsSkillId: hrmTrainingCourse.grantsSkillId,
      state: hrmTrainingCourse.state,
    })
    .from(hrmTrainingCourse)
    .leftJoin(
      hrmTrainingCategory,
      eq(hrmTrainingCategory.id, hrmTrainingCourse.categoryId)
    )
    .where(eq(hrmTrainingCourse.organizationId, organizationId))
    .orderBy(asc(hrmTrainingCourse.name))

  return rows.map((row) => ({
    ...row,
    defaultDurationHours: row.defaultDurationHours?.toString() ?? null,
    defaultCreditUnits: row.defaultCreditUnits?.toString() ?? null,
  }))
}

export async function listTrainingSessionsForOrg(
  organizationId: string,
  options?: { readonly courseId?: string; readonly openOnly?: boolean }
): Promise<HrmTrainingSessionRow[]> {
  const conditions = [eq(hrmTrainingSession.organizationId, organizationId)]
  if (options?.courseId) {
    conditions.push(eq(hrmTrainingSession.courseId, options.courseId))
  }
  if (options?.openOnly) {
    conditions.push(
      inArray(hrmTrainingSession.state, ["scheduled", "in_progress"])
    )
  }

  const rows = await db
    .select({
      id: hrmTrainingSession.id,
      courseId: hrmTrainingSession.courseId,
      courseCode: hrmTrainingCourse.code,
      courseName: hrmTrainingCourse.name,
      code: hrmTrainingSession.code,
      title: hrmTrainingSession.title,
      scheduledStartAt: hrmTrainingSession.scheduledStartAt,
      scheduledEndAt: hrmTrainingSession.scheduledEndAt,
      location: hrmTrainingSession.location,
      meetingUrl: hrmTrainingSession.meetingUrl,
      trainerName: hrmTrainingSession.trainerName,
      state: hrmTrainingSession.state,
      rosterCount: sql<number>`(
        SELECT COUNT(*)::int FROM hrm_training_assignment a
        WHERE a."organizationId" = ${organizationId}
          AND a."sessionId" = ${hrmTrainingSession.id}
      )`,
    })
    .from(hrmTrainingSession)
    .innerJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmTrainingSession.courseId)
    )
    .where(and(...conditions))
    .orderBy(desc(hrmTrainingSession.scheduledStartAt))

  return rows
}

export async function listTrainingAssignmentsForOrg(
  organizationId: string,
  options?: {
    readonly employeeId?: string
    readonly sessionId?: string
    readonly states?: string[]
  }
): Promise<HrmTrainingAssignmentRow[]> {
  const conditions = [eq(hrmTrainingAssignment.organizationId, organizationId)]
  if (options?.employeeId) {
    conditions.push(eq(hrmTrainingAssignment.employeeId, options.employeeId))
  }
  if (options?.sessionId) {
    conditions.push(eq(hrmTrainingAssignment.sessionId, options.sessionId))
  }
  if (options?.states?.length) {
    conditions.push(inArray(hrmTrainingAssignment.state, options.states))
  }

  const rows = await db
    .select({
      id: hrmTrainingAssignment.id,
      courseId: hrmTrainingAssignment.courseId,
      courseCode: hrmTrainingCourse.code,
      courseName: hrmTrainingCourse.name,
      sessionId: hrmTrainingAssignment.sessionId,
      sessionTitle: hrmTrainingSession.title,
      employeeId: hrmTrainingAssignment.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeName: hrmEmployee.legalName,
      assignedAt: hrmTrainingAssignment.assignedAt,
      dueAt: hrmTrainingAssignment.dueAt,
      required: hrmTrainingAssignment.required,
      state: hrmTrainingAssignment.state,
      attendance: hrmTrainingAssignment.attendance,
      priority: hrmTrainingAssignment.priority,
      sourceKind: hrmTrainingAssignment.sourceKind,
    })
    .from(hrmTrainingAssignment)
    .innerJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmTrainingAssignment.courseId)
    )
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmTrainingAssignment.employeeId)
    )
    .leftJoin(
      hrmTrainingSession,
      eq(hrmTrainingSession.id, hrmTrainingAssignment.sessionId)
    )
    .where(and(...conditions))
    .orderBy(desc(hrmTrainingAssignment.assignedAt))

  return rows
}

export async function listTrainingRecordsForOrg(
  organizationId: string,
  options?: { readonly employeeId?: string }
): Promise<HrmTrainingRecord[]> {
  const conditions = [eq(hrmTrainingRecord.organizationId, organizationId)]
  if (options?.employeeId) {
    conditions.push(eq(hrmTrainingRecord.employeeId, options.employeeId))
  }

  const rows = await db
    .select({
      id: hrmTrainingRecord.id,
      organizationId: hrmTrainingRecord.organizationId,
      assignmentId: hrmTrainingRecord.assignmentId,
      sessionId: hrmTrainingRecord.sessionId,
      courseId: hrmTrainingRecord.courseId,
      courseCode: hrmTrainingCourse.code,
      courseName: hrmTrainingCourse.name,
      employeeId: hrmTrainingRecord.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeName: hrmEmployee.legalName,
      completedAt: hrmTrainingRecord.completedAt,
      expiresAt: hrmTrainingRecord.expiresAt,
      verificationState: hrmTrainingRecord.verificationState,
      statutoryFlag: hrmTrainingCourse.statutoryFlag,
      statutoryAuthorityCode: hrmTrainingCourse.statutoryAuthorityCode,
      recertificationIntervalMonths:
        hrmTrainingCourse.recertificationIntervalMonths,
      certificateDocumentId: hrmTrainingRecord.certificateDocumentId,
      feedbackRating: hrmTrainingRecord.feedbackRating,
      feedbackText: hrmTrainingRecord.feedbackText,
    })
    .from(hrmTrainingRecord)
    .innerJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmTrainingRecord.courseId)
    )
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmTrainingRecord.employeeId))
    .where(and(...conditions))
    .orderBy(desc(hrmTrainingRecord.completedAt))

  return rows
}

export async function listExpiringTrainingRecords(
  organizationId: string,
  withinDays: number
): Promise<HrmTrainingRecord[]> {
  const asOf = new Date()
  const horizon = new Date(asOf)
  horizon.setUTCDate(horizon.getUTCDate() + withinDays)

  const rows = await db
    .select({
      id: hrmTrainingRecord.id,
      organizationId: hrmTrainingRecord.organizationId,
      assignmentId: hrmTrainingRecord.assignmentId,
      sessionId: hrmTrainingRecord.sessionId,
      courseId: hrmTrainingRecord.courseId,
      courseCode: hrmTrainingCourse.code,
      courseName: hrmTrainingCourse.name,
      employeeId: hrmTrainingRecord.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeName: hrmEmployee.legalName,
      completedAt: hrmTrainingRecord.completedAt,
      expiresAt: hrmTrainingRecord.expiresAt,
      verificationState: hrmTrainingRecord.verificationState,
      statutoryFlag: hrmTrainingCourse.statutoryFlag,
      statutoryAuthorityCode: hrmTrainingCourse.statutoryAuthorityCode,
      recertificationIntervalMonths:
        hrmTrainingCourse.recertificationIntervalMonths,
      certificateDocumentId: hrmTrainingRecord.certificateDocumentId,
      feedbackRating: hrmTrainingRecord.feedbackRating,
      feedbackText: hrmTrainingRecord.feedbackText,
    })
    .from(hrmTrainingRecord)
    .innerJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmTrainingRecord.courseId)
    )
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmTrainingRecord.employeeId))
    .where(
      and(
        eq(hrmTrainingRecord.organizationId, organizationId),
        isNotNull(hrmTrainingRecord.expiresAt),
        lte(hrmTrainingRecord.expiresAt, horizon)
      )
    )
    .orderBy(asc(hrmTrainingRecord.expiresAt))

  return rows
}

export async function getTrainingCourseById(
  organizationId: string,
  courseId: string
) {
  const [row] = await db
    .select()
    .from(hrmTrainingCourse)
    .where(
      and(
        eq(hrmTrainingCourse.organizationId, organizationId),
        eq(hrmTrainingCourse.id, courseId)
      )
    )
    .limit(1)
  return row ?? null
}

export async function getTrainingRecordById(
  organizationId: string,
  recordId: string
) {
  const [row] = await db
    .select({
      id: hrmTrainingRecord.id,
      courseId: hrmTrainingRecord.courseId,
      employeeId: hrmTrainingRecord.employeeId,
      courseName: hrmTrainingCourse.name,
    })
    .from(hrmTrainingRecord)
    .innerJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmTrainingRecord.courseId)
    )
    .where(
      and(
        eq(hrmTrainingRecord.organizationId, organizationId),
        eq(hrmTrainingRecord.id, recordId)
      )
    )
    .limit(1)
  return row ?? null
}

export type TrainingFeedbackForCourseRow = {
  readonly recordId: string
  readonly employeeId: string
  readonly employeeDisplayName: string
  readonly completedAt: Date
  readonly feedbackRating: number
  readonly feedbackText: string | null
  readonly verificationState: string
}

export async function listTrainingFeedbackForCourse(
  organizationId: string,
  courseId: string
): Promise<readonly TrainingFeedbackForCourseRow[]> {
  const rows = await db
    .select({
      recordId: hrmTrainingRecord.id,
      employeeId: hrmTrainingRecord.employeeId,
      employeeDisplayName: hrmEmployee.legalName,
      completedAt: hrmTrainingRecord.completedAt,
      feedbackRating: hrmTrainingRecord.feedbackRating,
      feedbackText: hrmTrainingRecord.feedbackText,
      verificationState: hrmTrainingRecord.verificationState,
    })
    .from(hrmTrainingRecord)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmTrainingRecord.employeeId))
    .where(
      and(
        eq(hrmTrainingRecord.organizationId, organizationId),
        eq(hrmTrainingRecord.courseId, courseId),
        isNotNull(hrmTrainingRecord.feedbackRating)
      )
    )
    .orderBy(desc(hrmTrainingRecord.completedAt))

  return rows.filter(
    (r): r is (typeof rows)[number] & { feedbackRating: number } =>
      r.feedbackRating !== null
  ) as readonly TrainingFeedbackForCourseRow[]
}

export async function getTrainingSessionById(
  organizationId: string,
  sessionId: string
) {
  const [row] = await db
    .select()
    .from(hrmTrainingSession)
    .where(
      and(
        eq(hrmTrainingSession.organizationId, organizationId),
        eq(hrmTrainingSession.id, sessionId)
      )
    )
    .limit(1)
  return row ?? null
}
