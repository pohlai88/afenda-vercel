import "server-only"

import { and, count, desc, eq, inArray, lt } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmCareerDiscussion,
  hrmCareerPathFramework,
  hrmDevelopmentCoachAssignment,
  hrmDevelopmentGoal,
  hrmDevelopmentLearningAction,
  hrmDevelopmentMentorAssignment,
  hrmDevelopmentMilestone,
  hrmDevelopmentPlan,
  hrmDevelopmentSession,
  hrmDevelopmentStretchAssignment,
  hrmEmployee,
  hrmEmployeeCareerAspiration,
  hrmEmployeeReadinessSnapshot,
  hrmEmployeeSkill,
  hrmEmployeeTargetRole,
  hrmSkill,
  hrmTrainingCourse,
} from "#lib/db/schema"

import type {
  CareerGapRow,
  DevelopmentGoalRow,
  DevelopmentPlanRow,
  LearningActionRow,
  ReadinessRow,
  StretchAssignmentRow,
  TargetRoleRow,
} from "./career-pathing.types.shared"

export async function listTargetRolesForOrg(
  organizationId: string
): Promise<TargetRoleRow[]> {
  const rows = await db
    .select({
      id: hrmEmployeeTargetRole.id,
      employeeId: hrmEmployeeTargetRole.employeeId,
      employeeName: hrmEmployee.legalName,
      employeeNumber: hrmEmployee.employeeNumber,
      targetRoleTitle: hrmEmployeeTargetRole.targetRoleTitle,
      source: hrmEmployeeTargetRole.source,
      isPrimary: hrmEmployeeTargetRole.isPrimary,
      frameworkName: hrmCareerPathFramework.name,
    })
    .from(hrmEmployeeTargetRole)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmEmployeeTargetRole.employeeId))
    .leftJoin(
      hrmCareerPathFramework,
      eq(hrmCareerPathFramework.id, hrmEmployeeTargetRole.frameworkId)
    )
    .where(eq(hrmEmployeeTargetRole.organizationId, organizationId))
    .orderBy(desc(hrmEmployeeTargetRole.updatedAt))

  return rows
}

export async function listDevelopmentPlansForOrg(
  organizationId: string
): Promise<DevelopmentPlanRow[]> {
  const plans = await db
    .select({
      id: hrmDevelopmentPlan.id,
      employeeId: hrmDevelopmentPlan.employeeId,
      employeeName: hrmEmployee.legalName,
      title: hrmDevelopmentPlan.title,
      status: hrmDevelopmentPlan.status,
    })
    .from(hrmDevelopmentPlan)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmDevelopmentPlan.employeeId))
    .where(eq(hrmDevelopmentPlan.organizationId, organizationId))
    .orderBy(desc(hrmDevelopmentPlan.updatedAt))

  if (plans.length === 0) return []

  const planIds = plans.map((p) => p.id)
  const goalCounts = await db
    .select({
      planId: hrmDevelopmentGoal.planId,
      total: count(),
    })
    .from(hrmDevelopmentGoal)
    .where(inArray(hrmDevelopmentGoal.planId, planIds))
    .groupBy(hrmDevelopmentGoal.planId)

  const overdueCounts = await db
    .select({
      planId: hrmDevelopmentGoal.planId,
      total: count(),
    })
    .from(hrmDevelopmentMilestone)
    .innerJoin(
      hrmDevelopmentGoal,
      eq(hrmDevelopmentGoal.id, hrmDevelopmentMilestone.goalId)
    )
    .where(
      and(
        inArray(hrmDevelopmentGoal.planId, planIds),
        eq(hrmDevelopmentMilestone.status, "overdue")
      )
    )
    .groupBy(hrmDevelopmentGoal.planId)

  const goalMap = new Map(goalCounts.map((g) => [g.planId, Number(g.total)]))
  const overdueMap = new Map(
    overdueCounts.map((o) => [o.planId, Number(o.total)])
  )

  return plans.map((plan) => ({
    ...plan,
    goalCount: goalMap.get(plan.id) ?? 0,
    overdueMilestoneCount: overdueMap.get(plan.id) ?? 0,
  }))
}

export async function listGoalsForPlan(
  organizationId: string,
  planId: string
): Promise<DevelopmentGoalRow[]> {
  const goals = await db
    .select({
      id: hrmDevelopmentGoal.id,
      planId: hrmDevelopmentGoal.planId,
      title: hrmDevelopmentGoal.title,
      goalType: hrmDevelopmentGoal.goalType,
      status: hrmDevelopmentGoal.status,
      targetDate: hrmDevelopmentGoal.targetDate,
    })
    .from(hrmDevelopmentGoal)
    .where(
      and(
        eq(hrmDevelopmentGoal.organizationId, organizationId),
        eq(hrmDevelopmentGoal.planId, planId)
      )
    )
    .orderBy(hrmDevelopmentGoal.title)

  if (goals.length === 0) return []

  const goalIds = goals.map((g) => g.id)
  const milestoneCounts = await db
    .select({
      goalId: hrmDevelopmentMilestone.goalId,
      total: count(),
    })
    .from(hrmDevelopmentMilestone)
    .where(inArray(hrmDevelopmentMilestone.goalId, goalIds))
    .groupBy(hrmDevelopmentMilestone.goalId)

  const milestoneMap = new Map(
    milestoneCounts.map((m) => [m.goalId, Number(m.total)])
  )

  return goals.map((goal) => ({
    ...goal,
    targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
    milestoneCount: milestoneMap.get(goal.id) ?? 0,
  }))
}

export async function listSkillGapsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<CareerGapRow[]> {
  const [target] = await db
    .select({ id: hrmEmployeeTargetRole.id })
    .from(hrmEmployeeTargetRole)
    .where(
      and(
        eq(hrmEmployeeTargetRole.organizationId, organizationId),
        eq(hrmEmployeeTargetRole.employeeId, employeeId),
        eq(hrmEmployeeTargetRole.isPrimary, true)
      )
    )
    .limit(1)

  if (!target) return []

  const skills = await db
    .select({
      skillName: hrmSkill.label,
      proficiency: hrmEmployeeSkill.proficiency,
    })
    .from(hrmEmployeeSkill)
    .innerJoin(hrmSkill, eq(hrmSkill.id, hrmEmployeeSkill.skillId))
    .where(
      and(
        eq(hrmEmployeeSkill.organizationId, organizationId),
        eq(hrmEmployeeSkill.employeeId, employeeId)
      )
    )

  return skills
    .filter((row) => row.proficiency < 4)
    .map((row) => ({
      skillName: row.skillName,
      currentLevel: String(row.proficiency),
      targetLevel: "4",
      gap: String(Math.max(0, 4 - row.proficiency)),
    }))
}

export async function listLearningActionsForPlan(
  organizationId: string,
  planId: string
): Promise<LearningActionRow[]> {
  return db
    .select({
      id: hrmDevelopmentLearningAction.id,
      title: hrmDevelopmentLearningAction.title,
      status: hrmDevelopmentLearningAction.status,
      courseName: hrmTrainingCourse.name,
      goalTitle: hrmDevelopmentGoal.title,
    })
    .from(hrmDevelopmentLearningAction)
    .innerJoin(
      hrmDevelopmentGoal,
      eq(hrmDevelopmentGoal.id, hrmDevelopmentLearningAction.goalId)
    )
    .leftJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmDevelopmentLearningAction.trainingCourseId)
    )
    .where(
      and(
        eq(hrmDevelopmentLearningAction.organizationId, organizationId),
        eq(hrmDevelopmentGoal.planId, planId)
      )
    )
}

export async function listStretchAssignmentsForPlan(
  organizationId: string,
  planId: string
): Promise<StretchAssignmentRow[]> {
  const rows = await db
    .select({
      id: hrmDevelopmentStretchAssignment.id,
      title: hrmDevelopmentStretchAssignment.title,
      status: hrmDevelopmentStretchAssignment.status,
      assignmentKind: hrmDevelopmentStretchAssignment.assignmentKind,
    })
    .from(hrmDevelopmentStretchAssignment)
    .where(
      and(
        eq(hrmDevelopmentStretchAssignment.organizationId, organizationId),
        eq(hrmDevelopmentStretchAssignment.planId, planId)
      )
    )
  return rows
}

export async function listMentorAssignmentsForPlan(
  organizationId: string,
  planId: string
) {
  return db
    .select({
      id: hrmDevelopmentMentorAssignment.id,
      mentorName: hrmEmployee.legalName,
      status: hrmDevelopmentMentorAssignment.status,
    })
    .from(hrmDevelopmentMentorAssignment)
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmDevelopmentMentorAssignment.mentorEmployeeId)
    )
    .where(
      and(
        eq(hrmDevelopmentMentorAssignment.organizationId, organizationId),
        eq(hrmDevelopmentMentorAssignment.planId, planId)
      )
    )
}

export async function listCoachAssignmentsForPlan(
  organizationId: string,
  planId: string
) {
  return db
    .select({
      id: hrmDevelopmentCoachAssignment.id,
      coachName: hrmEmployee.legalName,
      objective: hrmDevelopmentCoachAssignment.objective,
      status: hrmDevelopmentCoachAssignment.status,
    })
    .from(hrmDevelopmentCoachAssignment)
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmDevelopmentCoachAssignment.coachEmployeeId)
    )
    .where(
      and(
        eq(hrmDevelopmentCoachAssignment.organizationId, organizationId),
        eq(hrmDevelopmentCoachAssignment.planId, planId)
      )
    )
}

export async function listDevelopmentSessionsForPlan(
  organizationId: string,
  planId: string
) {
  return db
    .select()
    .from(hrmDevelopmentSession)
    .where(
      and(
        eq(hrmDevelopmentSession.organizationId, organizationId),
        eq(hrmDevelopmentSession.planId, planId)
      )
    )
    .orderBy(desc(hrmDevelopmentSession.sessionDate))
}

export async function listCareerDiscussionsForOrg(organizationId: string) {
  return db
    .select({
      id: hrmCareerDiscussion.id,
      employeeName: hrmEmployee.legalName,
      discussionDate: hrmCareerDiscussion.discussionDate,
      nextReviewDate: hrmCareerDiscussion.nextReviewDate,
      notes: hrmCareerDiscussion.notes,
    })
    .from(hrmCareerDiscussion)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmCareerDiscussion.employeeId))
    .where(eq(hrmCareerDiscussion.organizationId, organizationId))
    .orderBy(desc(hrmCareerDiscussion.discussionDate))
}

export async function listLatestReadinessForOrg(
  organizationId: string
): Promise<ReadinessRow[]> {
  const rows = await db
    .select({
      employeeId: hrmEmployeeReadinessSnapshot.employeeId,
      employeeName: hrmEmployee.legalName,
      targetRoleTitle: hrmEmployeeTargetRole.targetRoleTitle,
      readinessLevel: hrmEmployeeReadinessSnapshot.readinessLevel,
      progressPercent: hrmEmployeeReadinessSnapshot.progressPercent,
      computedAt: hrmEmployeeReadinessSnapshot.computedAt,
    })
    .from(hrmEmployeeReadinessSnapshot)
    .innerJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmEmployeeReadinessSnapshot.employeeId)
    )
    .leftJoin(
      hrmEmployeeTargetRole,
      eq(hrmEmployeeTargetRole.id, hrmEmployeeReadinessSnapshot.targetRoleId)
    )
    .where(eq(hrmEmployeeReadinessSnapshot.organizationId, organizationId))
    .orderBy(desc(hrmEmployeeReadinessSnapshot.computedAt))

  const seen = new Set<string>()
  const result: ReadinessRow[] = []
  for (const row of rows) {
    if (seen.has(row.employeeId)) continue
    seen.add(row.employeeId)
    result.push({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      targetRoleTitle: row.targetRoleTitle,
      readinessLevel: row.readinessLevel,
      progressPercent: row.progressPercent,
    })
  }
  return result
}

export async function countOverdueMilestonesForOrg(
  organizationId: string
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const [row] = await db
    .select({ total: count() })
    .from(hrmDevelopmentMilestone)
    .where(
      and(
        eq(hrmDevelopmentMilestone.organizationId, organizationId),
        inArray(hrmDevelopmentMilestone.status, [
          "not_started",
          "in_progress",
        ]),
        lt(hrmDevelopmentMilestone.targetDate, today)
      )
    )
  return Number(row?.total ?? 0)
}

export async function countActivePlansForOrg(
  organizationId: string
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(hrmDevelopmentPlan)
    .where(
      and(
        eq(hrmDevelopmentPlan.organizationId, organizationId),
        eq(hrmDevelopmentPlan.status, "active")
      )
    )
  return Number(row?.total ?? 0)
}

export async function getCareerAspirationForEmployee(
  organizationId: string,
  employeeId: string
) {
  const [row] = await db
    .select()
    .from(hrmEmployeeCareerAspiration)
    .where(
      and(
        eq(hrmEmployeeCareerAspiration.organizationId, organizationId),
        eq(hrmEmployeeCareerAspiration.employeeId, employeeId)
      )
    )
    .limit(1)
  return row ?? null
}

export async function listDevelopmentLearningRefsForEmployee(
  organizationId: string,
  employeeId: string
) {
  return db
    .select({
      learningActionId: hrmDevelopmentLearningAction.id,
      title: hrmDevelopmentLearningAction.title,
      status: hrmDevelopmentLearningAction.status,
      courseId: hrmDevelopmentLearningAction.trainingCourseId,
      courseName: hrmTrainingCourse.name,
      planTitle: hrmDevelopmentPlan.title,
    })
    .from(hrmDevelopmentLearningAction)
    .innerJoin(
      hrmDevelopmentGoal,
      eq(hrmDevelopmentGoal.id, hrmDevelopmentLearningAction.goalId)
    )
    .innerJoin(
      hrmDevelopmentPlan,
      eq(hrmDevelopmentPlan.id, hrmDevelopmentGoal.planId)
    )
    .leftJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmDevelopmentLearningAction.trainingCourseId)
    )
    .where(
      and(
        eq(hrmDevelopmentPlan.organizationId, organizationId),
        eq(hrmDevelopmentPlan.employeeId, employeeId)
      )
    )
}

export async function listReadinessRefsForSuccession(
  organizationId: string,
  employeeIds: readonly string[]
) {
  if (employeeIds.length === 0) return []
  return db
    .select({
      employeeId: hrmEmployeeReadinessSnapshot.employeeId,
      readinessLevel: hrmEmployeeReadinessSnapshot.readinessLevel,
      progressPercent: hrmEmployeeReadinessSnapshot.progressPercent,
      computedAt: hrmEmployeeReadinessSnapshot.computedAt,
    })
    .from(hrmEmployeeReadinessSnapshot)
    .where(
      and(
        eq(hrmEmployeeReadinessSnapshot.organizationId, organizationId),
        inArray(hrmEmployeeReadinessSnapshot.employeeId, [...employeeIds])
      )
    )
    .orderBy(desc(hrmEmployeeReadinessSnapshot.computedAt))
}

export async function recomputeReadinessForEmployee(
  organizationId: string,
  employeeId: string
): Promise<void> {
  const plans = await db
    .select({ id: hrmDevelopmentPlan.id, status: hrmDevelopmentPlan.status })
    .from(hrmDevelopmentPlan)
    .where(
      and(
        eq(hrmDevelopmentPlan.organizationId, organizationId),
        eq(hrmDevelopmentPlan.employeeId, employeeId)
      )
    )

  const [target] = await db
    .select({ id: hrmEmployeeTargetRole.id })
    .from(hrmEmployeeTargetRole)
    .where(
      and(
        eq(hrmEmployeeTargetRole.organizationId, organizationId),
        eq(hrmEmployeeTargetRole.employeeId, employeeId),
        eq(hrmEmployeeTargetRole.isPrimary, true)
      )
    )
    .limit(1)

  const activePlans = plans.filter((p) => p.status === "active").length
  const progressPercent = Math.min(100, activePlans * 25)
  const readinessLevel =
    progressPercent >= 80
      ? "role_ready"
      : progressPercent >= 60
        ? "ready"
        : progressPercent >= 40
          ? "near_ready"
          : progressPercent >= 20
            ? "developing"
            : "not_ready"

  await db.insert(hrmEmployeeReadinessSnapshot).values({
    organizationId,
    employeeId,
    targetRoleId: target?.id ?? null,
    readinessLevel,
    progressPercent,
  })
}
