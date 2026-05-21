import "server-only"

import { and, desc, eq, gte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceEvent,
  hrmEmployee,
  hrmTimeClockDevice,
  hrmTimeClockEmployeeMapping,
  hrmTimeClockPunchException,
  hrmTimeClockSyncBatch,
} from "#lib/db/schema"

export type TimeClockDeviceRow = {
  readonly id: string
  readonly organizationId: string
  readonly externalDeviceId: string
  readonly name: string
  readonly deviceType: string
  readonly locationRef: string | null
  readonly state: string
  readonly syncStatus: string
  readonly lastSyncAt: Date | null
  readonly createdAt: Date
}

export type TimeClockMappingRow = {
  readonly id: string
  readonly deviceId: string
  readonly deviceName: string
  readonly employeeId: string
  readonly employeeNumber: string | null
  readonly employeeLegalName: string | null
  readonly clockUserId: string | null
  readonly badgeId: string | null
  readonly state: string
  readonly createdAt: Date
}

export type TimeClockKpiSummary = {
  readonly activeDevices: number
  readonly activeMappings: number
  readonly pendingExceptions: number
  readonly failedSyncDevices: number
  readonly punchesToday: number
}

export type TimeClockExceptionRow = {
  readonly id: string
  readonly employeeId: string
  readonly employeeLegalName: string | null
  readonly employeeNumber: string | null
  readonly deviceName: string | null
  readonly eventType: string
  readonly occurredAt: Date
  readonly detectionOutcome: string
  readonly reason: string
  readonly state: string
  readonly createdAt: Date
}

export async function listTimeClockDevicesForOrg(
  organizationId: string
): Promise<TimeClockDeviceRow[]> {
  return db
    .select({
      id: hrmTimeClockDevice.id,
      organizationId: hrmTimeClockDevice.organizationId,
      externalDeviceId: hrmTimeClockDevice.externalDeviceId,
      name: hrmTimeClockDevice.name,
      deviceType: hrmTimeClockDevice.deviceType,
      locationRef: hrmTimeClockDevice.locationRef,
      state: hrmTimeClockDevice.state,
      syncStatus: hrmTimeClockDevice.syncStatus,
      lastSyncAt: hrmTimeClockDevice.lastSyncAt,
      createdAt: hrmTimeClockDevice.createdAt,
    })
    .from(hrmTimeClockDevice)
    .where(eq(hrmTimeClockDevice.organizationId, organizationId))
    .orderBy(desc(hrmTimeClockDevice.updatedAt))
}

export async function getTimeClockDeviceForOrg(
  organizationId: string,
  deviceId: string
) {
  return db.query.hrmTimeClockDevice.findFirst({
    where: and(
      eq(hrmTimeClockDevice.organizationId, organizationId),
      eq(hrmTimeClockDevice.id, deviceId)
    ),
  })
}

export async function findTimeClockDeviceByExternalId(input: {
  organizationId: string
  externalDeviceId: string
}) {
  return db.query.hrmTimeClockDevice.findFirst({
    where: and(
      eq(hrmTimeClockDevice.organizationId, input.organizationId),
      eq(hrmTimeClockDevice.externalDeviceId, input.externalDeviceId)
    ),
  })
}

export async function listTimeClockMappingsForOrg(
  organizationId: string
): Promise<TimeClockMappingRow[]> {
  const rows = await db
    .select({
      id: hrmTimeClockEmployeeMapping.id,
      deviceId: hrmTimeClockEmployeeMapping.deviceId,
      deviceName: hrmTimeClockDevice.name,
      employeeId: hrmTimeClockEmployeeMapping.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
      clockUserId: hrmTimeClockEmployeeMapping.clockUserId,
      badgeId: hrmTimeClockEmployeeMapping.badgeId,
      state: hrmTimeClockEmployeeMapping.state,
      createdAt: hrmTimeClockEmployeeMapping.createdAt,
    })
    .from(hrmTimeClockEmployeeMapping)
    .innerJoin(
      hrmTimeClockDevice,
      eq(hrmTimeClockEmployeeMapping.deviceId, hrmTimeClockDevice.id)
    )
    .innerJoin(
      hrmEmployee,
      eq(hrmTimeClockEmployeeMapping.employeeId, hrmEmployee.id)
    )
    .where(eq(hrmTimeClockEmployeeMapping.organizationId, organizationId))
    .orderBy(desc(hrmTimeClockEmployeeMapping.updatedAt))

  return rows
}

export async function findActiveTimeClockMapping(input: {
  organizationId: string
  deviceId: string
  clockUserId: string
}) {
  return db.query.hrmTimeClockEmployeeMapping.findFirst({
    where: and(
      eq(hrmTimeClockEmployeeMapping.organizationId, input.organizationId),
      eq(hrmTimeClockEmployeeMapping.deviceId, input.deviceId),
      eq(hrmTimeClockEmployeeMapping.clockUserId, input.clockUserId),
      eq(hrmTimeClockEmployeeMapping.state, "active")
    ),
  })
}

export async function findActiveTimeClockMappingForEmployee(input: {
  organizationId: string
  deviceId: string
  employeeId: string
}) {
  return db.query.hrmTimeClockEmployeeMapping.findFirst({
    where: and(
      eq(hrmTimeClockEmployeeMapping.organizationId, input.organizationId),
      eq(hrmTimeClockEmployeeMapping.deviceId, input.deviceId),
      eq(hrmTimeClockEmployeeMapping.employeeId, input.employeeId),
      eq(hrmTimeClockEmployeeMapping.state, "active")
    ),
  })
}

export async function getTimeClockExceptionForOrg(
  organizationId: string,
  exceptionId: string
) {
  const rows = await db
    .select({
      id: hrmTimeClockPunchException.id,
      organizationId: hrmTimeClockPunchException.organizationId,
      employeeId: hrmTimeClockPunchException.employeeId,
      deviceId: hrmTimeClockPunchException.deviceId,
      state: hrmTimeClockPunchException.state,
      eventType: hrmTimeClockPunchException.eventType,
      occurredAt: hrmTimeClockPunchException.occurredAt,
      detectionOutcome: hrmTimeClockPunchException.detectionOutcome,
      reason: hrmTimeClockPunchException.reason,
      rawPayloadHash: hrmTimeClockPunchException.rawPayloadHash,
      sourceRef: hrmTimeClockPunchException.sourceRef,
      externalDeviceId: hrmTimeClockDevice.externalDeviceId,
    })
    .from(hrmTimeClockPunchException)
    .leftJoin(
      hrmTimeClockDevice,
      eq(hrmTimeClockPunchException.deviceId, hrmTimeClockDevice.id)
    )
    .where(
      and(
        eq(hrmTimeClockPunchException.organizationId, organizationId),
        eq(hrmTimeClockPunchException.id, exceptionId)
      )
    )
    .limit(1)

  return rows[0] ?? null
}

export async function countTimeClockKpiSummary(
  organizationId: string
): Promise<TimeClockKpiSummary> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const [deviceCounts, mappingCount, exceptionCount, punchCount] =
    await Promise.all([
      db
        .select({
          active: sql<number>`count(*) filter (where ${hrmTimeClockDevice.state} = 'active')`,
          failed: sql<number>`count(*) filter (where ${hrmTimeClockDevice.syncStatus} = 'failed')`,
        })
        .from(hrmTimeClockDevice)
        .where(eq(hrmTimeClockDevice.organizationId, organizationId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(hrmTimeClockEmployeeMapping)
        .where(
          and(
            eq(hrmTimeClockEmployeeMapping.organizationId, organizationId),
            eq(hrmTimeClockEmployeeMapping.state, "active")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(hrmTimeClockPunchException)
        .where(
          and(
            eq(hrmTimeClockPunchException.organizationId, organizationId),
            eq(hrmTimeClockPunchException.state, "submitted")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(hrmAttendanceEvent)
        .where(
          and(
            eq(hrmAttendanceEvent.organizationId, organizationId),
            eq(hrmAttendanceEvent.source, "device"),
            gte(hrmAttendanceEvent.occurredAt, startOfDay)
          )
        ),
    ])

  const devices = deviceCounts[0]

  return {
    activeDevices: Number(devices?.active ?? 0),
    activeMappings: Number(mappingCount[0]?.count ?? 0),
    pendingExceptions: Number(exceptionCount[0]?.count ?? 0),
    failedSyncDevices: Number(devices?.failed ?? 0),
    punchesToday: Number(punchCount[0]?.count ?? 0),
  }
}

export async function listTimeClockExceptionsForOrg(
  organizationId: string,
  options?: { state?: string }
): Promise<TimeClockExceptionRow[]> {
  const conditions = [eq(hrmTimeClockPunchException.organizationId, organizationId)]
  if (options?.state) {
    conditions.push(eq(hrmTimeClockPunchException.state, options.state))
  }

  return db
    .select({
      id: hrmTimeClockPunchException.id,
      employeeId: hrmTimeClockPunchException.employeeId,
      employeeLegalName: hrmEmployee.legalName,
      employeeNumber: hrmEmployee.employeeNumber,
      deviceName: hrmTimeClockDevice.name,
      eventType: hrmTimeClockPunchException.eventType,
      occurredAt: hrmTimeClockPunchException.occurredAt,
      detectionOutcome: hrmTimeClockPunchException.detectionOutcome,
      reason: hrmTimeClockPunchException.reason,
      state: hrmTimeClockPunchException.state,
      createdAt: hrmTimeClockPunchException.createdAt,
    })
    .from(hrmTimeClockPunchException)
    .leftJoin(
      hrmEmployee,
      eq(hrmTimeClockPunchException.employeeId, hrmEmployee.id)
    )
    .leftJoin(
      hrmTimeClockDevice,
      eq(hrmTimeClockPunchException.deviceId, hrmTimeClockDevice.id)
    )
    .where(and(...conditions))
    .orderBy(desc(hrmTimeClockPunchException.createdAt))
    .limit(100)
}

export async function listTimeClockSyncBatchesForOrg(organizationId: string) {
  return db
    .select()
    .from(hrmTimeClockSyncBatch)
    .where(eq(hrmTimeClockSyncBatch.organizationId, organizationId))
    .orderBy(desc(hrmTimeClockSyncBatch.startedAt))
    .limit(50)
}
