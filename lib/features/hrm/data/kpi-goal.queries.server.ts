import "server-only"

import { and, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmKpiGoal,
  hrmKpiGoalComment,
  hrmKpiGoalMilestone,
} from "#lib/db/schema"

import type { KpiGoalStatus } from "../schemas/kpi-goal.schema"

export type KpiGoalRow = {
  id: string
  organizationId: string
  ownerEmployeeId: string
  ownerLegalName: string
  title: string
  description: string | null
  status: string
  percentComplete: number
  dueDate: Date
  completionDate: Date | null
  alignsWithGoalId: string | null
  sharedWithEmployeeIds: string[]
  createdAt: Date
  updatedAt: Date
}

export async function countKpiGoalsByStatus(input: {
  organizationId: string
}): Promise<Record<KpiGoalStatus, number>> {
  const rows = await db
    .select({
      status: hrmKpiGoal.status,
      c: sql<number>`count(*)::int`,
    })
    .from(hrmKpiGoal)
    .where(eq(hrmKpiGoal.organizationId, input.organizationId))
    .groupBy(hrmKpiGoal.status)

  const base: Record<KpiGoalStatus, number> = {
    in_progress: 0,
    completed: 0,
    closed: 0,
  }
  for (const r of rows) {
    if (
      r.status === "in_progress" ||
      r.status === "completed" ||
      r.status === "closed"
    ) {
      base[r.status] = r.c
    }
  }
  return base
}

export async function listKpiGoalsForOrganization(input: {
  organizationId: string
  status?: KpiGoalStatus
  limit?: number
}): Promise<KpiGoalRow[]> {
  const limit = input.limit ?? 100
  const where = [eq(hrmKpiGoal.organizationId, input.organizationId)]
  if (input.status) {
    where.push(eq(hrmKpiGoal.status, input.status))
  }

  const rows = await db
    .select({
      id: hrmKpiGoal.id,
      organizationId: hrmKpiGoal.organizationId,
      ownerEmployeeId: hrmKpiGoal.ownerEmployeeId,
      ownerLegalName: hrmEmployee.legalName,
      title: hrmKpiGoal.title,
      description: hrmKpiGoal.description,
      status: hrmKpiGoal.status,
      percentComplete: hrmKpiGoal.percentComplete,
      dueDate: hrmKpiGoal.dueDate,
      completionDate: hrmKpiGoal.completionDate,
      alignsWithGoalId: hrmKpiGoal.alignsWithGoalId,
      sharedWithEmployeeIds: hrmKpiGoal.sharedWithEmployeeIds,
      createdAt: hrmKpiGoal.createdAt,
      updatedAt: hrmKpiGoal.updatedAt,
    })
    .from(hrmKpiGoal)
    .innerJoin(hrmEmployee, eq(hrmKpiGoal.ownerEmployeeId, hrmEmployee.id))
    .where(and(...where))
    .orderBy(desc(hrmKpiGoal.dueDate), desc(hrmKpiGoal.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    sharedWithEmployeeIds: Array.isArray(r.sharedWithEmployeeIds)
      ? [...r.sharedWithEmployeeIds]
      : [],
  }))
}

export async function getKpiGoalById(input: {
  organizationId: string
  goalId: string
}): Promise<KpiGoalRow | null> {
  const [row] = await db
    .select({
      id: hrmKpiGoal.id,
      organizationId: hrmKpiGoal.organizationId,
      ownerEmployeeId: hrmKpiGoal.ownerEmployeeId,
      ownerLegalName: hrmEmployee.legalName,
      title: hrmKpiGoal.title,
      description: hrmKpiGoal.description,
      status: hrmKpiGoal.status,
      percentComplete: hrmKpiGoal.percentComplete,
      dueDate: hrmKpiGoal.dueDate,
      completionDate: hrmKpiGoal.completionDate,
      alignsWithGoalId: hrmKpiGoal.alignsWithGoalId,
      sharedWithEmployeeIds: hrmKpiGoal.sharedWithEmployeeIds,
      createdAt: hrmKpiGoal.createdAt,
      updatedAt: hrmKpiGoal.updatedAt,
    })
    .from(hrmKpiGoal)
    .innerJoin(hrmEmployee, eq(hrmKpiGoal.ownerEmployeeId, hrmEmployee.id))
    .where(
      and(
        eq(hrmKpiGoal.organizationId, input.organizationId),
        eq(hrmKpiGoal.id, input.goalId)
      )
    )
    .limit(1)

  if (!row) return null
  return {
    ...row,
    sharedWithEmployeeIds: Array.isArray(row.sharedWithEmployeeIds)
      ? [...row.sharedWithEmployeeIds]
      : [],
  }
}

export async function listKpiGoalMilestones(input: {
  organizationId: string
  goalId: string
}) {
  return db
    .select()
    .from(hrmKpiGoalMilestone)
    .where(
      and(
        eq(hrmKpiGoalMilestone.organizationId, input.organizationId),
        eq(hrmKpiGoalMilestone.goalId, input.goalId)
      )
    )
    .orderBy(hrmKpiGoalMilestone.sortOrder, hrmKpiGoalMilestone.createdAt)
}

export async function getKpiGoalMilestoneById(input: {
  organizationId: string
  milestoneId: string
}) {
  const [row] = await db
    .select({
      id: hrmKpiGoalMilestone.id,
      goalId: hrmKpiGoalMilestone.goalId,
    })
    .from(hrmKpiGoalMilestone)
    .where(
      and(
        eq(hrmKpiGoalMilestone.organizationId, input.organizationId),
        eq(hrmKpiGoalMilestone.id, input.milestoneId)
      )
    )
    .limit(1)

  return row ?? null
}

export async function getKpiGoalCommentById(input: {
  organizationId: string
  commentId: string
}) {
  const [row] = await db
    .select({
      id: hrmKpiGoalComment.id,
      goalId: hrmKpiGoalComment.goalId,
      authorUserId: hrmKpiGoalComment.authorUserId,
    })
    .from(hrmKpiGoalComment)
    .where(
      and(
        eq(hrmKpiGoalComment.organizationId, input.organizationId),
        eq(hrmKpiGoalComment.id, input.commentId)
      )
    )
    .limit(1)

  return row ?? null
}

export async function listKpiGoalComments(input: {
  organizationId: string
  goalId: string
}) {
  return db
    .select()
    .from(hrmKpiGoalComment)
    .where(
      and(
        eq(hrmKpiGoalComment.organizationId, input.organizationId),
        eq(hrmKpiGoalComment.goalId, input.goalId)
      )
    )
    .orderBy(hrmKpiGoalComment.createdAt)
}

export async function listKpiGoalMilestonesForGoals(input: {
  organizationId: string
  goalIds: string[]
}) {
  if (input.goalIds.length === 0) return []
  return db
    .select()
    .from(hrmKpiGoalMilestone)
    .where(
      and(
        eq(hrmKpiGoalMilestone.organizationId, input.organizationId),
        inArray(hrmKpiGoalMilestone.goalId, input.goalIds)
      )
    )
    .orderBy(hrmKpiGoalMilestone.goalId, hrmKpiGoalMilestone.sortOrder, hrmKpiGoalMilestone.createdAt)
}

export async function listKpiGoalCommentsForGoals(input: {
  organizationId: string
  goalIds: string[]
}) {
  if (input.goalIds.length === 0) return []
  return db
    .select()
    .from(hrmKpiGoalComment)
    .where(
      and(
        eq(hrmKpiGoalComment.organizationId, input.organizationId),
        inArray(hrmKpiGoalComment.goalId, input.goalIds)
      )
    )
    .orderBy(hrmKpiGoalComment.goalId, hrmKpiGoalComment.createdAt)
}

export async function listKpiGoalAggregateForOrganization(input: {
  organizationId: string
  status?: KpiGoalStatus
}) {
  const [counts, goals] = await Promise.all([
    countKpiGoalsByStatus({ organizationId: input.organizationId }),
    listKpiGoalsForOrganization({
      organizationId: input.organizationId,
      status: input.status,
      limit: 50,
    }),
  ])

  const ownerIds = [...new Set(goals.map((g) => g.ownerEmployeeId))]
  const persons =
    ownerIds.length === 0
      ? []
      : await db
          .select({
            employeeId: hrmEmployee.id,
            legalName: hrmEmployee.legalName,
            employeeNumber: hrmEmployee.employeeNumber,
          })
          .from(hrmEmployee)
          .where(
            and(
              eq(hrmEmployee.organizationId, input.organizationId),
              inArray(hrmEmployee.id, ownerIds)
            )
          )

  return {
    filters: { status: input.status ?? null },
    counts,
    goals,
    persons,
  }
}
