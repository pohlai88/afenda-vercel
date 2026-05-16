import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmTrainingAssignment } from "#lib/db/schema"

import { validateTrainingPrerequisitesMet } from "./training-prerequisite.server"
import { canTransitionTrainingAssignment } from "../schemas/training.schema"
import type { HrmTrainingAssignmentState } from "../schemas/training.schema"

export type AssignTrainingInput = {
  readonly organizationId: string
  readonly courseId: string
  readonly sessionId?: string | null
  readonly employeeId: string
  readonly dueAt?: Date | null
  readonly required: boolean
  readonly priority: string
  readonly sourceKind: string
  readonly sourceReference?: string | null
  readonly actorUserId: string
}

export async function assignTrainingInTransaction(
  input: AssignTrainingInput
): Promise<
  { ok: true; assignmentId: string } | { ok: false; message: string }
> {
  const prereq = await validateTrainingPrerequisitesMet({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    courseId: input.courseId,
  })
  if (!prereq.ok) {
    return { ok: false, message: prereq.message }
  }

  const now = new Date()
  const [row] = await db
    .insert(hrmTrainingAssignment)
    .values({
      organizationId: input.organizationId,
      courseId: input.courseId,
      sessionId: input.sessionId ?? null,
      employeeId: input.employeeId,
      assignedAt: now,
      dueAt: input.dueAt ?? null,
      required: input.required,
      state: "assigned",
      priority: input.priority,
      sourceKind: input.sourceKind,
      sourceReference: input.sourceReference ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
    .returning({ id: hrmTrainingAssignment.id })

  if (!row?.id) {
    return {
      ok: false,
      message:
        "Failed to create training assignment — database did not return an ID.",
    }
  }

  return { ok: true, assignmentId: row.id }
}

export async function transitionTrainingAssignmentState(input: {
  readonly organizationId: string
  readonly assignmentId: string
  readonly toState: HrmTrainingAssignmentState
  readonly actorUserId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [assignment] = await db
    .select({
      state: hrmTrainingAssignment.state,
    })
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

  const from = assignment.state as HrmTrainingAssignmentState
  if (!canTransitionTrainingAssignment(from, input.toState)) {
    return {
      ok: false,
      message: `Cannot transition assignment from ${from} to ${input.toState}.`,
    }
  }

  await db
    .update(hrmTrainingAssignment)
    .set({
      state: input.toState,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(eq(hrmTrainingAssignment.id, input.assignmentId))

  return { ok: true }
}
