import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBoardingTask } from "#lib/db/schema"

import { transitionBoardingTask } from "./boarding.mutations.server"

/**
 * Post-seal hook: auto-complete boarding tasks after signature envelope is sealed.
 * Invoked from tools seal workflow via dynamic import (single allowed tools→HRM bridge).
 */
export async function onSignatureRequestSealedForBoardingTask(input: {
  readonly organizationId: string
  readonly taskId: string
  readonly actorUserId: string
  readonly evidenceDocumentId: string
}): Promise<void> {
  const [task] = await db
    .select({ status: hrmBoardingTask.status })
    .from(hrmBoardingTask)
    .where(
      and(
        eq(hrmBoardingTask.organizationId, input.organizationId),
        eq(hrmBoardingTask.id, input.taskId)
      )
    )
    .limit(1)

  if (!task || task.status === "completed" || task.status === "waived") {
    return
  }

  await transitionBoardingTask({
    organizationId: input.organizationId,
    taskId: input.taskId,
    actorUserId: input.actorUserId,
    action: "complete",
    evidenceDocumentId: input.evidenceDocumentId,
  })
}
