import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmTimeClockPunchException } from "#lib/db/schema"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_TCI_AUDIT } from "../tci.contract"
import type { TimeClockExceptionDecisionFormInput } from "../schemas/tci.schema"
import {
  TCI_PUNCH_EVENT_TYPES,
  type TciPunchEventType,
} from "../schemas/tci-workflow-state.shared"

import {
  findActiveTimeClockMappingForEmployee,
  getTimeClockExceptionForOrg,
} from "./tci.queries.server"
import {
  persistTimeClockPunch,
  type TimeClockCommandContext,
} from "./tci-punch-commands.server"
import { revalidateTimeClockSurfaces } from "./tci-revalidate.server"

export type TimeClockExceptionMutationResult =
  | { ok: true; exceptionId: string; eventId?: string }
  | { ok: false; errors: Record<string, string | undefined> }

export async function decideTimeClockPunchException(
  ctx: TimeClockCommandContext,
  input: TimeClockExceptionDecisionFormInput
): Promise<TimeClockExceptionMutationResult> {
  const existing = await getTimeClockExceptionForOrg(
    ctx.organizationId,
    input.exceptionId
  )
  if (!existing) {
    return hrmActionFailure({ exceptionId: "Exception not found." })
  }
  if (existing.state !== "submitted") {
    return hrmActionFailure({ form: "This exception has already been decided." })
  }

  if (input.decision === "reject") {
    if (!input.decisionReason?.trim()) {
      return hrmActionFailure({
        decisionReason: "Reason is required when rejecting.",
      })
    }

    await db
      .update(hrmTimeClockPunchException)
      .set({
        state: "rejected",
        reason: input.decisionReason.trim(),
        decidedAt: new Date(),
        decidedByUserId: ctx.userId,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmTimeClockPunchException.id, input.exceptionId),
          eq(hrmTimeClockPunchException.organizationId, ctx.organizationId)
        )
      )

    await writeIamAuditEventFromNextHeaders({
      action: HRM_TCI_AUDIT.exceptionReject,
      actorUserId: ctx.userId,
      actorSessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      resourceType: "hrm_time_clock_punch_exception",
      resourceId: input.exceptionId,
      metadata: { decision: "reject" },
    })

    revalidateTimeClockSurfaces()
    return { ok: true, exceptionId: input.exceptionId }
  }

  if (!existing.deviceId) {
    return hrmActionFailure({
      form: "Cannot approve — device reference is missing.",
    })
  }

  if (!existing.externalDeviceId) {
    return hrmActionFailure({
      form: "Cannot approve — device external ID is missing.",
    })
  }

  const mapping = await findActiveTimeClockMappingForEmployee({
    organizationId: ctx.organizationId,
    deviceId: existing.deviceId,
    employeeId: existing.employeeId,
  })

  const clockUserId = mapping?.clockUserId
  if (!clockUserId) {
    return hrmActionFailure({
      form: "Cannot approve — employee is not mapped on this device.",
    })
  }

  if (
    !(TCI_PUNCH_EVENT_TYPES as readonly string[]).includes(existing.eventType)
  ) {
    return hrmActionFailure({ form: "Unsupported punch event type on exception." })
  }

  const punch = {
    externalDeviceId: existing.externalDeviceId,
    clockUserId,
    eventType: existing.eventType as TciPunchEventType,
    occurredAtIso: existing.occurredAt.toISOString(),
    sourceRef: existing.sourceRef ?? undefined,
    rawPayloadHash: existing.rawPayloadHash ?? undefined,
  }

  const persistOutcome = await persistTimeClockPunch({
    ctx,
    deviceId: existing.deviceId,
    employeeId: existing.employeeId,
    punch,
    options: {
      recordExceptionOnReject: false,
      hrOverrideShiftWindow: true,
    },
  })

  if (persistOutcome.status === "duplicate") {
    await db
      .update(hrmTimeClockPunchException)
      .set({
        state: "approved",
        reason: "Approved — duplicate punch already on file.",
        decidedAt: new Date(),
        decidedByUserId: ctx.userId,
        updatedAt: sql`now()`,
      })
      .where(eq(hrmTimeClockPunchException.id, input.exceptionId))

    await writeIamAuditEventFromNextHeaders({
      action: HRM_TCI_AUDIT.exceptionApprove,
      actorUserId: ctx.userId,
      actorSessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      resourceType: "hrm_time_clock_punch_exception",
      resourceId: input.exceptionId,
      metadata: { decision: "approve", duplicate: true },
    })

    revalidateTimeClockSurfaces()
    return { ok: true, exceptionId: input.exceptionId }
  }

  if (persistOutcome.status === "rejected") {
    return hrmActionFailure({
      form: persistOutcome.message,
    })
  }

  await db
    .update(hrmTimeClockPunchException)
    .set({
      state: "approved",
      resolvedEventId: persistOutcome.eventId,
      decidedAt: new Date(),
      decidedByUserId: ctx.userId,
      updatedAt: sql`now()`,
    })
    .where(eq(hrmTimeClockPunchException.id, input.exceptionId))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_TCI_AUDIT.exceptionApprove,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_time_clock_punch_exception",
    resourceId: input.exceptionId,
    metadata: {
      decision: "approve",
      resolvedEventId: persistOutcome.eventId,
    },
  })

  revalidateTimeClockSurfaces()
  return {
    ok: true,
    exceptionId: input.exceptionId,
    eventId: persistOutcome.eventId,
  }
}
