import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmTimeClockEmployeeMapping } from "#lib/db/schema"

import { HRM_TCI_AUDIT } from "../tci.contract"
import type { UpsertTimeClockMappingFormInput } from "../schemas/tci.schema"

import { revalidateTimeClockSurfaces } from "./tci-revalidate.server"
import type { TimeClockCommandContext } from "./tci-punch-commands.server"
import type { TimeClockDeviceMutationResult } from "./tci-device-commands.server"

export async function upsertTimeClockMapping(
  ctx: TimeClockCommandContext,
  input: UpsertTimeClockMappingFormInput
): Promise<TimeClockDeviceMutationResult> {
  const isUpdate = Boolean(input.id)
  const mappingId = input.id ?? crypto.randomUUID()

  const values = {
    organizationId: ctx.organizationId,
    deviceId: input.deviceId,
    employeeId: input.employeeId,
    clockUserId: input.clockUserId.trim(),
    badgeId: input.badgeId ?? null,
    biometricRef: input.biometricRef ?? null,
    state: input.state ?? "active",
    updatedByUserId: ctx.userId,
    updatedAt: new Date(),
  }

  if (isUpdate) {
    await db
      .update(hrmTimeClockEmployeeMapping)
      .set(values)
      .where(
        and(
          eq(hrmTimeClockEmployeeMapping.id, mappingId),
          eq(hrmTimeClockEmployeeMapping.organizationId, ctx.organizationId)
        )
      )
  } else {
    await db.insert(hrmTimeClockEmployeeMapping).values({
      id: mappingId,
      ...values,
      createdByUserId: ctx.userId,
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: isUpdate ? HRM_TCI_AUDIT.mappingUpdate : HRM_TCI_AUDIT.mappingCreate,
    actorUserId: ctx.userId,
    actorSessionId: ctx.sessionId,
    organizationId: ctx.organizationId,
    resourceType: "hrm_time_clock_employee_mapping",
    resourceId: mappingId,
    metadata: {
      deviceId: values.deviceId,
      employeeId: values.employeeId,
      clockUserId: values.clockUserId,
    },
  })

  revalidateTimeClockSurfaces()
  return { ok: true, deviceId: mappingId }
}
