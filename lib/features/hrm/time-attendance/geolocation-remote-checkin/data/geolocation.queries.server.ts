import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
} from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceEvent,
  hrmEmployee,
  hrmGeofence,
  hrmRemoteCheckinDevice,
  hrmRemoteCheckinException,
  hrmRemoteCheckinPolicy,
} from "#lib/db/schema"

import type { RemoteCheckinExceptionRow } from "../schemas/geolocation.schema"
import type {
  GeofenceScopeKind,
  RemoteCheckinDeviceState,
  RemoteCheckinEventType,
  RemoteCheckinExceptionState,
  RemoteCheckinPolicyScope,
  RemoteCheckinVerificationOutcome,
} from "../schemas/geolocation-workflow-state.shared"

// ---------------------------------------------------------------------------
// Shared row types (data layer ↔ server reads)
// ---------------------------------------------------------------------------

export type GeofenceRow = {
  readonly id: string
  readonly organizationId: string
  readonly code: string
  readonly label: string
  readonly scopeKind: GeofenceScopeKind
  readonly latitude: string
  readonly longitude: string
  readonly radiusMeters: number
  readonly bufferMeters: number
  readonly countryCode: string | null
  readonly legalEntityCode: string | null
  readonly notes: string | null
  readonly archivedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type RemoteCheckinPolicyRow = {
  readonly id: string
  readonly organizationId: string
  readonly scopeKind: RemoteCheckinPolicyScope
  readonly scopeRef: string | null
  readonly minGpsAccuracyMeters: number
  readonly allowedRadiusBufferMeters: number
  readonly shiftWindowMinutes: number
  readonly breakWindowMinutes: number
  readonly requireRegisteredDevice: boolean
  readonly requireSelfie: boolean
  readonly detectSpoofing: boolean
  readonly allowEligibilityException: boolean
  readonly isActive: boolean
  readonly updatedAt: Date
}

export type RemoteCheckinDeviceRow = {
  readonly id: string
  readonly organizationId: string
  readonly employeeId: string
  readonly employeeNumber: string | null
  readonly employeeLegalName: string | null
  readonly deviceLabel: string
  readonly deviceFingerprint: string
  readonly state: RemoteCheckinDeviceState
  readonly lastSeenAt: Date | null
  readonly lastIpAddress: string | null
  readonly revokedAt: Date | null
  readonly revokedReason: string | null
  readonly createdAt: Date
}

export type RemoteCheckinHistoryRow = {
  readonly id: string
  readonly employeeId: string
  readonly employeeNumber: string | null
  readonly employeeLegalName: string | null
  readonly eventType: RemoteCheckinEventType
  readonly occurredAt: Date
  readonly latitude: string | null
  readonly longitude: string | null
  readonly gpsAccuracyMeters: number | null
  readonly deviceId: string | null
  readonly geofenceId: string | null
  readonly geofenceLabel: string | null
  readonly locationVerificationOutcome: RemoteCheckinVerificationOutcome | null
  readonly selfieBlobUrl: string | null
  readonly createdAt: Date
}

export type RemoteCheckinExceptionListRow = RemoteCheckinExceptionRow & {
  readonly employeeNumber: string | null
  readonly employeeLegalName: string | null
}

export type RemoteCheckinKpiSummary = {
  readonly verifiedTodayCount: number
  readonly pendingExceptionCount: number
  readonly outsideGeofenceTodayCount: number
  readonly weakAccuracyTodayCount: number
  readonly activeGeofenceCount: number
  readonly registeredDeviceCount: number
}

// ---------------------------------------------------------------------------
// Geofence reads
// ---------------------------------------------------------------------------

export async function listGeofencesForOrg(
  organizationId: string,
  options: { includeArchived?: boolean; scopeKind?: GeofenceScopeKind } = {}
): Promise<GeofenceRow[]> {
  const conditions = [eq(hrmGeofence.organizationId, organizationId)]
  if (!options.includeArchived) {
    conditions.push(isNull(hrmGeofence.archivedAt))
  }
  if (options.scopeKind) {
    conditions.push(eq(hrmGeofence.scopeKind, options.scopeKind))
  }
  const rows = await db
    .select({
      id: hrmGeofence.id,
      organizationId: hrmGeofence.organizationId,
      code: hrmGeofence.code,
      label: hrmGeofence.label,
      scopeKind: hrmGeofence.scopeKind,
      latitude: hrmGeofence.latitude,
      longitude: hrmGeofence.longitude,
      radiusMeters: hrmGeofence.radiusMeters,
      bufferMeters: hrmGeofence.bufferMeters,
      countryCode: hrmGeofence.countryCode,
      legalEntityCode: hrmGeofence.legalEntityCode,
      notes: hrmGeofence.notes,
      archivedAt: hrmGeofence.archivedAt,
      createdAt: hrmGeofence.createdAt,
      updatedAt: hrmGeofence.updatedAt,
    })
    .from(hrmGeofence)
    .where(and(...conditions))
    .orderBy(asc(hrmGeofence.code))
  return rows.map((row) => ({
    ...row,
    scopeKind: row.scopeKind as GeofenceScopeKind,
  }))
}

export async function getGeofenceForOrg(
  organizationId: string,
  geofenceId: string
): Promise<GeofenceRow | null> {
  const row = await db.query.hrmGeofence.findFirst({
    where: and(
      eq(hrmGeofence.organizationId, organizationId),
      eq(hrmGeofence.id, geofenceId)
    ),
  })
  if (!row) return null
  return {
    ...row,
    scopeKind: row.scopeKind as GeofenceScopeKind,
  }
}

// ---------------------------------------------------------------------------
// Policy reads
// ---------------------------------------------------------------------------

export async function listRemoteCheckinPoliciesForOrg(
  organizationId: string
): Promise<RemoteCheckinPolicyRow[]> {
  const rows = await db
    .select()
    .from(hrmRemoteCheckinPolicy)
    .where(eq(hrmRemoteCheckinPolicy.organizationId, organizationId))
    .orderBy(asc(hrmRemoteCheckinPolicy.scopeKind))
  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    scopeKind: row.scopeKind as RemoteCheckinPolicyScope,
    scopeRef: row.scopeRef,
    minGpsAccuracyMeters: row.minGpsAccuracyMeters,
    allowedRadiusBufferMeters: row.allowedRadiusBufferMeters,
    shiftWindowMinutes: row.shiftWindowMinutes,
    breakWindowMinutes: row.breakWindowMinutes,
    requireRegisteredDevice: row.requireRegisteredDevice,
    requireSelfie: row.requireSelfie,
    detectSpoofing: row.detectSpoofing,
    allowEligibilityException: row.allowEligibilityException,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  }))
}

export async function getActiveRemoteCheckinPolicyForOrg(
  organizationId: string
): Promise<RemoteCheckinPolicyRow | null> {
  const row = await db.query.hrmRemoteCheckinPolicy.findFirst({
    where: and(
      eq(hrmRemoteCheckinPolicy.organizationId, organizationId),
      eq(hrmRemoteCheckinPolicy.scopeKind, "org"),
      eq(hrmRemoteCheckinPolicy.isActive, true)
    ),
  })
  if (!row) return null
  return {
    id: row.id,
    organizationId: row.organizationId,
    scopeKind: row.scopeKind as RemoteCheckinPolicyScope,
    scopeRef: row.scopeRef,
    minGpsAccuracyMeters: row.minGpsAccuracyMeters,
    allowedRadiusBufferMeters: row.allowedRadiusBufferMeters,
    shiftWindowMinutes: row.shiftWindowMinutes,
    breakWindowMinutes: row.breakWindowMinutes,
    requireRegisteredDevice: row.requireRegisteredDevice,
    requireSelfie: row.requireSelfie,
    detectSpoofing: row.detectSpoofing,
    allowEligibilityException: row.allowEligibilityException,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Device reads
// ---------------------------------------------------------------------------

export async function listRemoteCheckinDevicesForOrg(
  organizationId: string,
  options: { state?: RemoteCheckinDeviceState; employeeId?: string } = {}
): Promise<RemoteCheckinDeviceRow[]> {
  const conditions = [eq(hrmRemoteCheckinDevice.organizationId, organizationId)]
  if (options.state) {
    conditions.push(eq(hrmRemoteCheckinDevice.state, options.state))
  }
  if (options.employeeId) {
    conditions.push(eq(hrmRemoteCheckinDevice.employeeId, options.employeeId))
  }
  const rows = await db
    .select({
      id: hrmRemoteCheckinDevice.id,
      organizationId: hrmRemoteCheckinDevice.organizationId,
      employeeId: hrmRemoteCheckinDevice.employeeId,
      deviceLabel: hrmRemoteCheckinDevice.deviceLabel,
      deviceFingerprint: hrmRemoteCheckinDevice.deviceFingerprint,
      state: hrmRemoteCheckinDevice.state,
      lastSeenAt: hrmRemoteCheckinDevice.lastSeenAt,
      lastIpAddress: hrmRemoteCheckinDevice.lastIpAddress,
      revokedAt: hrmRemoteCheckinDevice.revokedAt,
      revokedReason: hrmRemoteCheckinDevice.revokedReason,
      createdAt: hrmRemoteCheckinDevice.createdAt,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
    })
    .from(hrmRemoteCheckinDevice)
    .leftJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmRemoteCheckinDevice.employeeId)
    )
    .where(and(...conditions))
    .orderBy(desc(hrmRemoteCheckinDevice.createdAt))
  return rows.map((row) => ({
    ...row,
    state: row.state as RemoteCheckinDeviceState,
  }))
}

export async function findActiveRemoteCheckinDevice(input: {
  organizationId: string
  employeeId: string
  deviceFingerprint: string
}): Promise<RemoteCheckinDeviceRow | null> {
  const row = await db.query.hrmRemoteCheckinDevice.findFirst({
    where: and(
      eq(hrmRemoteCheckinDevice.organizationId, input.organizationId),
      eq(hrmRemoteCheckinDevice.deviceFingerprint, input.deviceFingerprint)
    ),
  })
  if (!row) return null
  const employee = await db.query.hrmEmployee.findFirst({
    where: eq(hrmEmployee.id, row.employeeId),
    columns: { employeeNumber: true, legalName: true },
  })
  return {
    id: row.id,
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    employeeNumber: employee?.employeeNumber ?? null,
    employeeLegalName: employee?.legalName ?? null,
    deviceLabel: row.deviceLabel,
    deviceFingerprint: row.deviceFingerprint,
    state: row.state as RemoteCheckinDeviceState,
    lastSeenAt: row.lastSeenAt,
    lastIpAddress: row.lastIpAddress,
    revokedAt: row.revokedAt,
    revokedReason: row.revokedReason,
    createdAt: row.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Exception reads
// ---------------------------------------------------------------------------

export async function listRemoteCheckinExceptionsForOrg(
  organizationId: string,
  options: {
    states?: readonly RemoteCheckinExceptionState[]
    employeeId?: string
    limit?: number
  } = {}
): Promise<RemoteCheckinExceptionListRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500)
  const conditions = [
    eq(hrmRemoteCheckinException.organizationId, organizationId),
  ]
  if (options.states && options.states.length > 0) {
    conditions.push(
      inArray(hrmRemoteCheckinException.state, [...options.states])
    )
  }
  if (options.employeeId) {
    conditions.push(
      eq(hrmRemoteCheckinException.employeeId, options.employeeId)
    )
  }

  const rows = await db
    .select({
      id: hrmRemoteCheckinException.id,
      organizationId: hrmRemoteCheckinException.organizationId,
      employeeId: hrmRemoteCheckinException.employeeId,
      state: hrmRemoteCheckinException.state,
      eventType: hrmRemoteCheckinException.eventType,
      occurredAt: hrmRemoteCheckinException.occurredAt,
      latitude: hrmRemoteCheckinException.latitude,
      longitude: hrmRemoteCheckinException.longitude,
      gpsAccuracyMeters: hrmRemoteCheckinException.gpsAccuracyMeters,
      deviceId: hrmRemoteCheckinException.deviceId,
      remoteLocationLabel: hrmRemoteCheckinException.remoteLocationLabel,
      geofenceId: hrmRemoteCheckinException.geofenceId,
      selfieBlobUrl: hrmRemoteCheckinException.selfieBlobUrl,
      detectionOutcome: hrmRemoteCheckinException.detectionOutcome,
      reason: hrmRemoteCheckinException.reason,
      decisionReason: hrmRemoteCheckinException.decisionReason,
      decidedAt: hrmRemoteCheckinException.decidedAt,
      decidedByUserId: hrmRemoteCheckinException.decidedByUserId,
      resolvedEventId: hrmRemoteCheckinException.resolvedEventId,
      createdAt: hrmRemoteCheckinException.createdAt,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
    })
    .from(hrmRemoteCheckinException)
    .leftJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmRemoteCheckinException.employeeId)
    )
    .where(and(...conditions))
    .orderBy(desc(hrmRemoteCheckinException.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    state: row.state as RemoteCheckinExceptionState,
    eventType: row.eventType as RemoteCheckinEventType,
    occurredAt: row.occurredAt,
    latitude: row.latitude,
    longitude: row.longitude,
    gpsAccuracyMeters: row.gpsAccuracyMeters,
    deviceId: row.deviceId,
    remoteLocationLabel: row.remoteLocationLabel,
    geofenceId: row.geofenceId,
    selfieBlobUrl: row.selfieBlobUrl,
    detectionOutcome: row.detectionOutcome as RemoteCheckinVerificationOutcome,
    reason: row.reason,
    decisionReason: row.decisionReason,
    decidedAt: row.decidedAt,
    decidedByUserId: row.decidedByUserId,
    resolvedEventId: row.resolvedEventId,
    createdAt: row.createdAt,
    employeeNumber: row.employeeNumber,
    employeeLegalName: row.employeeLegalName,
  }))
}

export async function getRemoteCheckinExceptionForOrg(
  organizationId: string,
  exceptionId: string
): Promise<RemoteCheckinExceptionListRow | null> {
  const row = await db.query.hrmRemoteCheckinException.findFirst({
    where: and(
      eq(hrmRemoteCheckinException.organizationId, organizationId),
      eq(hrmRemoteCheckinException.id, exceptionId)
    ),
  })
  if (!row) return null
  const employee = await db.query.hrmEmployee.findFirst({
    where: eq(hrmEmployee.id, row.employeeId),
    columns: { employeeNumber: true, legalName: true },
  })
  return {
    id: row.id,
    organizationId: row.organizationId,
    employeeId: row.employeeId,
    state: row.state as RemoteCheckinExceptionState,
    eventType: row.eventType as RemoteCheckinEventType,
    occurredAt: row.occurredAt,
    latitude: row.latitude,
    longitude: row.longitude,
    gpsAccuracyMeters: row.gpsAccuracyMeters,
    deviceId: row.deviceId,
    remoteLocationLabel: row.remoteLocationLabel,
    geofenceId: row.geofenceId,
    selfieBlobUrl: row.selfieBlobUrl,
    detectionOutcome: row.detectionOutcome as RemoteCheckinVerificationOutcome,
    reason: row.reason,
    decisionReason: row.decisionReason,
    decidedAt: row.decidedAt,
    decidedByUserId: row.decidedByUserId,
    resolvedEventId: row.resolvedEventId,
    createdAt: row.createdAt,
    employeeNumber: employee?.employeeNumber ?? null,
    employeeLegalName: employee?.legalName ?? null,
  }
}

// ---------------------------------------------------------------------------
// Verified check-in history (reads from hrm_attendance_event)
// ---------------------------------------------------------------------------

export async function listVerifiedRemoteCheckinsForOrg(
  organizationId: string,
  options: { sinceDays?: number; limit?: number } = {}
): Promise<RemoteCheckinHistoryRow[]> {
  const sinceDays = Math.max(options.sinceDays ?? 7, 1)
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500)
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - sinceDays)

  const rows = await db
    .select({
      id: hrmAttendanceEvent.id,
      employeeId: hrmAttendanceEvent.employeeId,
      eventType: hrmAttendanceEvent.eventType,
      occurredAt: hrmAttendanceEvent.occurredAt,
      latitude: hrmAttendanceEvent.latitude,
      longitude: hrmAttendanceEvent.longitude,
      gpsAccuracyMeters: hrmAttendanceEvent.gpsAccuracyMeters,
      deviceId: hrmAttendanceEvent.deviceId,
      geofenceId: hrmAttendanceEvent.geofenceId,
      locationVerificationOutcome:
        hrmAttendanceEvent.locationVerificationOutcome,
      selfieBlobUrl: hrmAttendanceEvent.selfieBlobUrl,
      createdAt: hrmAttendanceEvent.createdAt,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
      geofenceLabel: hrmGeofence.label,
    })
    .from(hrmAttendanceEvent)
    .leftJoin(hrmEmployee, eq(hrmEmployee.id, hrmAttendanceEvent.employeeId))
    .leftJoin(hrmGeofence, eq(hrmGeofence.id, hrmAttendanceEvent.geofenceId))
    .where(
      and(
        eq(hrmAttendanceEvent.organizationId, organizationId),
        eq(hrmAttendanceEvent.source, "mobile"),
        gte(hrmAttendanceEvent.occurredAt, since)
      )
    )
    .orderBy(desc(hrmAttendanceEvent.occurredAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeNumber: row.employeeNumber,
    employeeLegalName: row.employeeLegalName,
    eventType: row.eventType as RemoteCheckinEventType,
    occurredAt: row.occurredAt,
    latitude: row.latitude,
    longitude: row.longitude,
    gpsAccuracyMeters: row.gpsAccuracyMeters,
    deviceId: row.deviceId,
    geofenceId: row.geofenceId,
    geofenceLabel: row.geofenceLabel,
    locationVerificationOutcome:
      (row.locationVerificationOutcome as RemoteCheckinVerificationOutcome | null) ??
      null,
    selfieBlobUrl: row.selfieBlobUrl,
    createdAt: row.createdAt,
  }))
}

export async function listVerifiedRemoteCheckinsForEmployeeDate(input: {
  organizationId: string
  employeeId: string
  attendanceDate: string
}): Promise<RemoteCheckinHistoryRow[]> {
  const start = new Date(`${input.attendanceDate}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  const rows = await db
    .select({
      id: hrmAttendanceEvent.id,
      employeeId: hrmAttendanceEvent.employeeId,
      eventType: hrmAttendanceEvent.eventType,
      occurredAt: hrmAttendanceEvent.occurredAt,
      latitude: hrmAttendanceEvent.latitude,
      longitude: hrmAttendanceEvent.longitude,
      gpsAccuracyMeters: hrmAttendanceEvent.gpsAccuracyMeters,
      deviceId: hrmAttendanceEvent.deviceId,
      geofenceId: hrmAttendanceEvent.geofenceId,
      locationVerificationOutcome:
        hrmAttendanceEvent.locationVerificationOutcome,
      selfieBlobUrl: hrmAttendanceEvent.selfieBlobUrl,
      createdAt: hrmAttendanceEvent.createdAt,
    })
    .from(hrmAttendanceEvent)
    .where(
      and(
        eq(hrmAttendanceEvent.organizationId, input.organizationId),
        eq(hrmAttendanceEvent.employeeId, input.employeeId),
        eq(hrmAttendanceEvent.source, "mobile"),
        gte(hrmAttendanceEvent.occurredAt, start),
        lte(hrmAttendanceEvent.occurredAt, end)
      )
    )
    .orderBy(asc(hrmAttendanceEvent.occurredAt))

  return rows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeNumber: null,
    employeeLegalName: null,
    eventType: row.eventType as RemoteCheckinEventType,
    occurredAt: row.occurredAt,
    latitude: row.latitude,
    longitude: row.longitude,
    gpsAccuracyMeters: row.gpsAccuracyMeters,
    deviceId: row.deviceId,
    geofenceId: row.geofenceId,
    geofenceLabel: null,
    locationVerificationOutcome:
      (row.locationVerificationOutcome as RemoteCheckinVerificationOutcome | null) ??
      null,
    selfieBlobUrl: row.selfieBlobUrl,
    createdAt: row.createdAt,
  }))
}

// ---------------------------------------------------------------------------
// KPI summary
// ---------------------------------------------------------------------------

export async function countRemoteCheckinKpiSummary(
  organizationId: string
): Promise<RemoteCheckinKpiSummary> {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)

  const [
    verifiedRow,
    pendingRow,
    outsideRow,
    weakRow,
    activeGeoRow,
    deviceRow,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(hrmAttendanceEvent)
      .where(
        and(
          eq(hrmAttendanceEvent.organizationId, organizationId),
          eq(hrmAttendanceEvent.source, "mobile"),
          gte(hrmAttendanceEvent.occurredAt, startOfToday)
        )
      ),
    db
      .select({ value: count() })
      .from(hrmRemoteCheckinException)
      .where(
        and(
          eq(hrmRemoteCheckinException.organizationId, organizationId),
          eq(hrmRemoteCheckinException.state, "submitted")
        )
      ),
    db
      .select({ value: count() })
      .from(hrmRemoteCheckinException)
      .where(
        and(
          eq(hrmRemoteCheckinException.organizationId, organizationId),
          eq(hrmRemoteCheckinException.detectionOutcome, "outside_geofence"),
          gte(hrmRemoteCheckinException.createdAt, startOfToday)
        )
      ),
    db
      .select({ value: count() })
      .from(hrmRemoteCheckinException)
      .where(
        and(
          eq(hrmRemoteCheckinException.organizationId, organizationId),
          eq(hrmRemoteCheckinException.detectionOutcome, "weak_accuracy"),
          gte(hrmRemoteCheckinException.createdAt, startOfToday)
        )
      ),
    db
      .select({ value: count() })
      .from(hrmGeofence)
      .where(
        and(
          eq(hrmGeofence.organizationId, organizationId),
          isNull(hrmGeofence.archivedAt)
        )
      ),
    db
      .select({ value: count() })
      .from(hrmRemoteCheckinDevice)
      .where(
        and(
          eq(hrmRemoteCheckinDevice.organizationId, organizationId),
          eq(hrmRemoteCheckinDevice.state, "active")
        )
      ),
  ])

  return {
    verifiedTodayCount: Number(verifiedRow[0]?.value ?? 0),
    pendingExceptionCount: Number(pendingRow[0]?.value ?? 0),
    outsideGeofenceTodayCount: Number(outsideRow[0]?.value ?? 0),
    weakAccuracyTodayCount: Number(weakRow[0]?.value ?? 0),
    activeGeofenceCount: Number(activeGeoRow[0]?.value ?? 0),
    registeredDeviceCount: Number(deviceRow[0]?.value ?? 0),
  }
}

// ---------------------------------------------------------------------------
// Employee resolution helpers (mirror of FWA pattern)
// ---------------------------------------------------------------------------

export type RemoteCheckinEmployeeContextRow = {
  readonly id: string
  readonly employeeNumber: string | null
  readonly legalName: string
  readonly managerEmployeeId: string | null
  readonly archivedAt: Date | null
}

export async function findRemoteCheckinEmployeeForUser(
  organizationId: string,
  userId: string
): Promise<RemoteCheckinEmployeeContextRow | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.linkedUserId, userId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      managerEmployeeId: true,
      archivedAt: true,
    },
  })
  return row ?? null
}

export async function getRemoteCheckinEmployeeForOrg(
  organizationId: string,
  employeeId: string
): Promise<RemoteCheckinEmployeeContextRow | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.id, employeeId)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      managerEmployeeId: true,
      archivedAt: true,
    },
  })
  return row ?? null
}
