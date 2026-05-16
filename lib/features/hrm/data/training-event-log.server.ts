import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeAssignment,
  hrmTrainingEvent,
} from "#lib/db/schema"

import type { HrmTrainingEventAction } from "../schemas/training.schema"

export type TrainingScopeSnapshot = {
  readonly departmentId: string | null
  readonly positionId: string | null
  readonly gradeId: string | null
  readonly costCenterCode: string | null
}

export async function resolveTrainingScopeSnapshot(
  organizationId: string,
  employeeId: string
): Promise<TrainingScopeSnapshot> {
  const [employee] = await db
    .select({
      departmentId: hrmEmployee.currentDepartmentId,
      positionId: hrmEmployee.currentPositionId,
      gradeId: hrmEmployee.currentJobGradeId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, employeeId)
      )
    )
    .limit(1)

  const [assignment] = await db
    .select({ costCenterCode: hrmEmployeeAssignment.costCenterCode })
    .from(hrmEmployeeAssignment)
    .where(
      and(
        eq(hrmEmployeeAssignment.organizationId, organizationId),
        eq(hrmEmployeeAssignment.employeeId, employeeId)
      )
    )
    .orderBy(sql`${hrmEmployeeAssignment.effectiveFrom} DESC`)
    .limit(1)

  return {
    departmentId: employee?.departmentId ?? null,
    positionId: employee?.positionId ?? null,
    gradeId: employee?.gradeId ?? null,
    costCenterCode: assignment?.costCenterCode ?? null,
  }
}

export async function appendTrainingEvent(input: {
  readonly organizationId: string
  readonly action: HrmTrainingEventAction
  readonly employeeId: string
  readonly actorUserId: string | null
  readonly assignmentId?: string | null
  readonly recordId?: string | null
  readonly sessionId?: string | null
  readonly payload?: Record<string, unknown>
}): Promise<{ inserted: boolean; eventId: string | null }> {
  const scope = await resolveTrainingScopeSnapshot(
    input.organizationId,
    input.employeeId
  )
  const payload = {
    ...scope,
    ...(input.payload ?? {}),
  }

  if (input.assignmentId) {
    const existing = await db
      .select({ id: hrmTrainingEvent.id })
      .from(hrmTrainingEvent)
      .where(
        and(
          eq(hrmTrainingEvent.organizationId, input.organizationId),
          eq(hrmTrainingEvent.employeeId, input.employeeId),
          eq(hrmTrainingEvent.assignmentId, input.assignmentId),
          eq(hrmTrainingEvent.action, input.action),
          sql`date_trunc('day', ${hrmTrainingEvent.occurredAt}) = date_trunc('day', NOW())`
        )
      )
      .limit(1)
    if (existing[0]) {
      return { inserted: false, eventId: existing[0].id }
    }
  }

  const [row] = await db
    .insert(hrmTrainingEvent)
    .values({
      organizationId: input.organizationId,
      action: input.action,
      employeeId: input.employeeId,
      actorUserId: input.actorUserId,
      assignmentId: input.assignmentId ?? null,
      recordId: input.recordId ?? null,
      sessionId: input.sessionId ?? null,
      payload,
    })
    .returning({ id: hrmTrainingEvent.id })

  return { inserted: true, eventId: row?.id ?? null }
}
