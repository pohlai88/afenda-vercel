import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployeeSkill, hrmTrainingCourse } from "#lib/db/schema"

import { getTrainingCourseById } from "./training.queries.server"

/**
 * When a course grants a catalog skill, upsert employee proficiency after completion.
 */
export async function grantSkillFromTrainingRecord(input: {
  readonly organizationId: string
  readonly courseId: string
  readonly employeeId: string
  readonly completedAt: Date
  readonly expiresAt: Date | null
  readonly actorUserId: string
}): Promise<{ granted: boolean; skillId: string | null }> {
  const course = await getTrainingCourseById(
    input.organizationId,
    input.courseId
  )
  const skillId = course?.grantsSkillId?.trim() || null
  if (!skillId) {
    return { granted: false, skillId: null }
  }

  const validityFrom = input.completedAt.toISOString().slice(0, 10)
  const validityTo = input.expiresAt
    ? input.expiresAt.toISOString().slice(0, 10)
    : null

  await db
    .insert(hrmEmployeeSkill)
    .values({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      skillId,
      proficiency: 3,
      validityFrom,
      validityTo,
      verifiedByUserId: input.actorUserId,
      verifiedAt: new Date(),
      notes: `Granted via training course ${course?.code ?? input.courseId}`,
    })
    .onConflictDoUpdate({
      target: [hrmEmployeeSkill.employeeId, hrmEmployeeSkill.skillId],
      set: {
        proficiency: 3,
        validityFrom,
        validityTo,
        verifiedByUserId: input.actorUserId,
        verifiedAt: new Date(),
        updatedAt: new Date(),
        notes: `Updated via training course ${course?.code ?? input.courseId}`,
      },
    })

  return { granted: true, skillId }
}

export async function resolveCourseGrantsSkillId(
  organizationId: string,
  courseId: string
): Promise<string | null> {
  const [row] = await db
    .select({ grantsSkillId: hrmTrainingCourse.grantsSkillId })
    .from(hrmTrainingCourse)
    .where(
      and(
        eq(hrmTrainingCourse.organizationId, organizationId),
        eq(hrmTrainingCourse.id, courseId)
      )
    )
    .limit(1)
  return row?.grantsSkillId?.trim() || null
}
