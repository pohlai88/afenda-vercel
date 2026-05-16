import "server-only"

import { and, eq, inArray, or } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmTrainingCourse,
  hrmTrainingPrerequisite,
  hrmTrainingRecord,
} from "#lib/db/schema"

export type TrainingPrerequisiteRow = {
  readonly id: string
  readonly courseId: string
  readonly prerequisiteCourseId: string
  readonly prerequisiteCourseCode: string
  readonly prerequisiteCourseName: string
  readonly required: boolean
}

export async function listAllPrerequisitesForOrg(
  organizationId: string
): Promise<readonly TrainingPrerequisiteRow[]> {
  const rows = await db
    .select({
      id: hrmTrainingPrerequisite.id,
      courseId: hrmTrainingPrerequisite.courseId,
      prerequisiteCourseId: hrmTrainingPrerequisite.prerequisiteCourseId,
      prerequisiteCourseCode: hrmTrainingCourse.code,
      prerequisiteCourseName: hrmTrainingCourse.name,
      required: hrmTrainingPrerequisite.required,
    })
    .from(hrmTrainingPrerequisite)
    .innerJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmTrainingPrerequisite.prerequisiteCourseId)
    )
    .where(eq(hrmTrainingPrerequisite.organizationId, organizationId))
    .orderBy(hrmTrainingPrerequisite.courseId, hrmTrainingCourse.code)

  return rows
}

export async function listPrerequisitesForCourse(
  organizationId: string,
  courseId: string
): Promise<readonly TrainingPrerequisiteRow[]> {
  const rows = await db
    .select({
      id: hrmTrainingPrerequisite.id,
      courseId: hrmTrainingPrerequisite.courseId,
      prerequisiteCourseId: hrmTrainingPrerequisite.prerequisiteCourseId,
      prerequisiteCourseCode: hrmTrainingCourse.code,
      prerequisiteCourseName: hrmTrainingCourse.name,
      required: hrmTrainingPrerequisite.required,
    })
    .from(hrmTrainingPrerequisite)
    .innerJoin(
      hrmTrainingCourse,
      eq(hrmTrainingCourse.id, hrmTrainingPrerequisite.prerequisiteCourseId)
    )
    .where(
      and(
        eq(hrmTrainingPrerequisite.organizationId, organizationId),
        eq(hrmTrainingPrerequisite.courseId, courseId)
      )
    )

  return rows
}

export async function validateTrainingPrerequisitesMet(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly courseId: string
}): Promise<
  { ok: true } | { ok: false; message: string; missingCourseCodes: string[] }
> {
  const prereqs = await listPrerequisitesForCourse(
    input.organizationId,
    input.courseId
  )
  const required = prereqs.filter((p) => p.required)
  if (required.length === 0) {
    return { ok: true }
  }

  const prereqIds = required.map((p) => p.prerequisiteCourseId)
  // Only verified completions count — self-attested records do not satisfy prerequisites.
  const completed = await db
    .select({ courseId: hrmTrainingRecord.courseId })
    .from(hrmTrainingRecord)
    .where(
      and(
        eq(hrmTrainingRecord.organizationId, input.organizationId),
        eq(hrmTrainingRecord.employeeId, input.employeeId),
        inArray(hrmTrainingRecord.courseId, prereqIds),
        or(
          eq(hrmTrainingRecord.verificationState, "hr_verified"),
          eq(hrmTrainingRecord.verificationState, "external_verified")
        )
      )
    )

  const completedSet = new Set(completed.map((r) => r.courseId))
  const missing = required.filter(
    (p) => !completedSet.has(p.prerequisiteCourseId)
  )

  if (missing.length === 0) {
    return { ok: true }
  }

  return {
    ok: false,
    message: `Complete prerequisite course(s) first: ${missing.map((m) => m.prerequisiteCourseCode).join(", ")}.`,
    missingCourseCodes: missing.map((m) => m.prerequisiteCourseCode),
  }
}

/**
 * Detect if adding courseId→prerequisiteCourseId would create a cycle.
 * Performs a BFS from prerequisiteCourseId following existing prerequisites;
 * if we reach courseId, adding the edge would form a cycle.
 */
async function wouldCreateCycle(
  organizationId: string,
  courseId: string,
  prerequisiteCourseId: string
): Promise<boolean> {
  const visited = new Set<string>()
  const queue: string[] = [prerequisiteCourseId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === courseId) return true
    if (visited.has(current)) continue
    visited.add(current)

    const prereqs = await db
      .select({
        prerequisiteCourseId: hrmTrainingPrerequisite.prerequisiteCourseId,
      })
      .from(hrmTrainingPrerequisite)
      .where(
        and(
          eq(hrmTrainingPrerequisite.organizationId, organizationId),
          eq(hrmTrainingPrerequisite.courseId, current)
        )
      )

    for (const p of prereqs) {
      if (!visited.has(p.prerequisiteCourseId)) {
        queue.push(p.prerequisiteCourseId)
      }
    }
  }

  return false
}

export async function addTrainingPrerequisite(input: {
  readonly organizationId: string
  readonly courseId: string
  readonly prerequisiteCourseId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.courseId === input.prerequisiteCourseId) {
    return { ok: false, message: "A course cannot be its own prerequisite." }
  }

  const cycle = await wouldCreateCycle(
    input.organizationId,
    input.courseId,
    input.prerequisiteCourseId
  )
  if (cycle) {
    return {
      ok: false,
      message:
        "Adding this prerequisite would create a circular dependency in the course chain.",
    }
  }

  const existing = await db
    .select({ id: hrmTrainingPrerequisite.id })
    .from(hrmTrainingPrerequisite)
    .where(
      and(
        eq(hrmTrainingPrerequisite.organizationId, input.organizationId),
        eq(hrmTrainingPrerequisite.courseId, input.courseId),
        eq(
          hrmTrainingPrerequisite.prerequisiteCourseId,
          input.prerequisiteCourseId
        )
      )
    )
    .limit(1)

  if (existing.length > 0) {
    return {
      ok: false,
      message: "This prerequisite is already set for the course.",
    }
  }

  await db.insert(hrmTrainingPrerequisite).values({
    organizationId: input.organizationId,
    courseId: input.courseId,
    prerequisiteCourseId: input.prerequisiteCourseId,
    required: true,
  })

  return { ok: true }
}

export async function removeTrainingPrerequisite(input: {
  readonly organizationId: string
  readonly prerequisiteId: string
}): Promise<void> {
  await db
    .delete(hrmTrainingPrerequisite)
    .where(
      and(
        eq(hrmTrainingPrerequisite.organizationId, input.organizationId),
        eq(hrmTrainingPrerequisite.id, input.prerequisiteId)
      )
    )
}
