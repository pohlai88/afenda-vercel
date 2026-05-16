import "server-only"

import { and, eq, inArray, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBoardingInstance, hrmBoardingTask } from "#lib/db/schema"

import { transitionBoardingTask } from "./boarding.mutations.server"
import { getTrainingCourseById } from "./training.queries.server"

export async function completeBoardingTasksForTrainingRecord(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly courseId: string
  readonly actorUserId: string
  readonly certificateDocumentId?: string | null
}): Promise<{ completedTaskIds: string[] }> {
  const course = await getTrainingCourseById(
    input.organizationId,
    input.courseId
  )
  if (!course) {
    return { completedTaskIds: [] }
  }

  const tasks = await db
    .select({
      taskId: hrmBoardingTask.id,
      taskStatus: hrmBoardingTask.status,
      metadata: hrmBoardingTask.metadata,
    })
    .from(hrmBoardingTask)
    .innerJoin(
      hrmBoardingInstance,
      eq(hrmBoardingInstance.id, hrmBoardingTask.instanceId)
    )
    .where(
      and(
        eq(hrmBoardingTask.organizationId, input.organizationId),
        eq(hrmBoardingInstance.employeeId, input.employeeId),
        eq(hrmBoardingTask.category, "compliance"),
        inArray(hrmBoardingTask.status, ["pending", "in_progress", "blocked"]),
        sql`${hrmBoardingTask.metadata}->>'trainingCourseCode' = ${course.code}`
      )
    )

  const completedTaskIds: string[] = []

  for (const task of tasks) {
    if (task.taskStatus === "completed" || task.taskStatus === "waived") {
      continue
    }
    const result = await transitionBoardingTask({
      organizationId: input.organizationId,
      taskId: task.taskId,
      actorUserId: input.actorUserId,
      action: "complete",
      evidenceDocumentId: input.certificateDocumentId ?? undefined,
    })
    if (result.ok) {
      completedTaskIds.push(task.taskId)
    }
  }

  return { completedTaskIds }
}
