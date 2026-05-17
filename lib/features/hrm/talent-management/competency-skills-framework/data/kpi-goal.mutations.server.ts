import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmKpiGoal,
  hrmKpiGoalComment,
  hrmKpiGoalMilestone,
} from "#lib/db/schema"

import { isoDateOnlyToUtcDate } from "../../../hrm-calendar-dates.server"

export async function insertKpiGoal(input: {
  organizationId: string
  ownerEmployeeId: string
  title: string
  description: string | null
  dueDateIso: string
  alignsWithGoalId: string | null
  sharedWithEmployeeIds: string[]
  createdByUserId: string
}): Promise<string> {
  const now = new Date()
  const dueDate = isoDateOnlyToUtcDate(input.dueDateIso)
  const [row] = await db
    .insert(hrmKpiGoal)
    .values({
      organizationId: input.organizationId,
      ownerEmployeeId: input.ownerEmployeeId,
      title: input.title,
      description: input.description,
      dueDate,
      alignsWithGoalId: input.alignsWithGoalId,
      sharedWithEmployeeIds: input.sharedWithEmployeeIds,
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: hrmKpiGoal.id })

  if (!row) throw new Error("insertKpiGoal: missing row")
  return row.id
}

export async function updateKpiGoal(input: {
  organizationId: string
  goalId: string
  title?: string
  description?: string | null
  dueDateIso?: string
  percentComplete?: number
  alignsWithGoalId?: string | null
  sharedWithEmployeeIds?: string[]
  status?: "in_progress" | "completed" | "closed"
  completionDate?: Date | null
  updatedByUserId: string
}): Promise<void> {
  const now = new Date()
  await db
    .update(hrmKpiGoal)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.dueDateIso !== undefined
        ? { dueDate: isoDateOnlyToUtcDate(input.dueDateIso) }
        : {}),
      ...(input.percentComplete !== undefined
        ? { percentComplete: input.percentComplete }
        : {}),
      ...(input.alignsWithGoalId !== undefined
        ? { alignsWithGoalId: input.alignsWithGoalId }
        : {}),
      ...(input.sharedWithEmployeeIds !== undefined
        ? { sharedWithEmployeeIds: input.sharedWithEmployeeIds }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.completionDate !== undefined
        ? { completionDate: input.completionDate }
        : {}),
      updatedByUserId: input.updatedByUserId,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmKpiGoal.organizationId, input.organizationId),
        eq(hrmKpiGoal.id, input.goalId)
      )
    )
}

export async function deleteKpiGoal(input: {
  organizationId: string
  goalId: string
}): Promise<void> {
  await db
    .delete(hrmKpiGoal)
    .where(
      and(
        eq(hrmKpiGoal.organizationId, input.organizationId),
        eq(hrmKpiGoal.id, input.goalId)
      )
    )
}

export async function insertKpiGoalMilestone(input: {
  organizationId: string
  goalId: string
  title: string
  sortOrder: number
  startValue: string | null
  endValue: string | null
  currentValue: string | null
  updatedByUserId: string
}): Promise<string> {
  const now = new Date()
  const [row] = await db
    .insert(hrmKpiGoalMilestone)
    .values({
      organizationId: input.organizationId,
      goalId: input.goalId,
      title: input.title,
      sortOrder: input.sortOrder,
      startValue: input.startValue,
      endValue: input.endValue,
      currentValue: input.currentValue,
      updatedByUserId: input.updatedByUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: hrmKpiGoalMilestone.id })

  if (!row) throw new Error("insertKpiGoalMilestone: missing row")
  return row.id
}

export async function updateKpiGoalMilestone(input: {
  organizationId: string
  milestoneId: string
  title?: string
  sortOrder?: number
  startValue?: string | null
  endValue?: string | null
  currentValue?: string | null
  completedAt?: Date | null
  updatedByUserId: string
}): Promise<void> {
  const now = new Date()
  await db
    .update(hrmKpiGoalMilestone)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.startValue !== undefined
        ? { startValue: input.startValue }
        : {}),
      ...(input.endValue !== undefined ? { endValue: input.endValue } : {}),
      ...(input.currentValue !== undefined
        ? { currentValue: input.currentValue }
        : {}),
      ...(input.completedAt !== undefined
        ? { completedAt: input.completedAt }
        : {}),
      updatedByUserId: input.updatedByUserId,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmKpiGoalMilestone.organizationId, input.organizationId),
        eq(hrmKpiGoalMilestone.id, input.milestoneId)
      )
    )
}

export async function deleteKpiGoalMilestone(input: {
  organizationId: string
  milestoneId: string
}): Promise<void> {
  await db
    .delete(hrmKpiGoalMilestone)
    .where(
      and(
        eq(hrmKpiGoalMilestone.organizationId, input.organizationId),
        eq(hrmKpiGoalMilestone.id, input.milestoneId)
      )
    )
}

export async function insertKpiGoalComment(input: {
  organizationId: string
  goalId: string
  authorUserId: string
  commentText: string
}): Promise<string> {
  const now = new Date()
  const [row] = await db
    .insert(hrmKpiGoalComment)
    .values({
      organizationId: input.organizationId,
      goalId: input.goalId,
      authorUserId: input.authorUserId,
      commentText: input.commentText,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: hrmKpiGoalComment.id })

  if (!row) throw new Error("insertKpiGoalComment: missing row")
  return row.id
}

export async function deleteKpiGoalComment(input: {
  organizationId: string
  commentId: string
}): Promise<void> {
  await db
    .delete(hrmKpiGoalComment)
    .where(
      and(
        eq(hrmKpiGoalComment.organizationId, input.organizationId),
        eq(hrmKpiGoalComment.id, input.commentId)
      )
    )
}
