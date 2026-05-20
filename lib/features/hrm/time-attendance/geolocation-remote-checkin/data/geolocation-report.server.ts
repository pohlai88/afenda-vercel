import "server-only"

import { and, asc, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceEvent,
  hrmEmployee,
  hrmGeofence,
  hrmRemoteCheckinException,
} from "#lib/db/schema"

import { maskLocationPrecision } from "./geolocation-display.shared"
import type { ExportRemoteCheckinReportFormInput } from "../schemas/geolocation.schema"

const CSV_HEADER = [
  "attendance_date",
  "employee_number",
  "employee_legal_name",
  "event_type",
  "occurred_at",
  "latitude",
  "longitude",
  "gps_accuracy_m",
  "geofence_code",
  "geofence_label",
  "outcome",
  "device_id",
  "selfie_blob_url",
  "row_kind",
] as const

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return ""
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export type RemoteCheckinReportCsv = {
  readonly csv: string
  readonly rowCount: number
  readonly filename: string
}

export async function buildRemoteCheckinReportCsv(input: {
  organizationId: string
  filters: ExportRemoteCheckinReportFormInput
}): Promise<RemoteCheckinReportCsv> {
  const { organizationId } = input
  const start = new Date(`${input.filters.startDate}T00:00:00.000Z`)
  const end = new Date(`${input.filters.endDate}T23:59:59.999Z`)

  const eventConditions = [
    eq(hrmAttendanceEvent.organizationId, organizationId),
    eq(hrmAttendanceEvent.source, "mobile"),
    gte(hrmAttendanceEvent.occurredAt, start),
    lte(hrmAttendanceEvent.occurredAt, end),
  ]
  if (input.filters.employeeId) {
    eventConditions.push(
      eq(hrmAttendanceEvent.employeeId, input.filters.employeeId)
    )
  }
  if (input.filters.geofenceId) {
    eventConditions.push(
      eq(hrmAttendanceEvent.geofenceId, input.filters.geofenceId)
    )
  }

  const eventsPromise = input.filters.onlyExceptions
    ? Promise.resolve([] as Awaited<ReturnType<typeof fetchEventRows>>)
    : fetchEventRows(eventConditions)

  const exceptionConditions = [
    eq(hrmRemoteCheckinException.organizationId, organizationId),
    gte(hrmRemoteCheckinException.createdAt, start),
    lte(hrmRemoteCheckinException.createdAt, end),
  ]
  if (input.filters.employeeId) {
    exceptionConditions.push(
      eq(hrmRemoteCheckinException.employeeId, input.filters.employeeId)
    )
  }
  if (input.filters.geofenceId) {
    exceptionConditions.push(
      eq(hrmRemoteCheckinException.geofenceId, input.filters.geofenceId)
    )
  }

  const [eventRows, exceptionRows] = await Promise.all([
    eventsPromise,
    fetchExceptionRows(exceptionConditions),
  ])

  const lines: string[] = []
  lines.push(CSV_HEADER.join(","))

  for (const row of eventRows) {
    const masked = maskLocationPrecision(
      row.latitude ? Number(row.latitude) : null,
      row.longitude ? Number(row.longitude) : null
    )
    lines.push(
      [
        row.occurredAt.toISOString().slice(0, 10),
        row.employeeNumber ?? "",
        row.employeeLegalName ?? "",
        row.eventType,
        row.occurredAt.toISOString(),
        masked.latitude ?? "",
        masked.longitude ?? "",
        row.gpsAccuracyMeters ?? "",
        row.geofenceCode ?? "",
        row.geofenceLabel ?? "",
        row.locationVerificationOutcome ?? "verified",
        row.deviceId ?? "",
        row.selfieBlobUrl ?? "",
        "verified",
      ]
        .map(escapeCsv)
        .join(",")
    )
  }

  for (const row of exceptionRows) {
    const masked = maskLocationPrecision(
      row.latitude ? Number(row.latitude) : null,
      row.longitude ? Number(row.longitude) : null
    )
    lines.push(
      [
        row.occurredAt.toISOString().slice(0, 10),
        row.employeeNumber ?? "",
        row.employeeLegalName ?? "",
        row.eventType,
        row.occurredAt.toISOString(),
        masked.latitude ?? "",
        masked.longitude ?? "",
        row.gpsAccuracyMeters ?? "",
        row.geofenceCode ?? "",
        row.geofenceLabel ?? "",
        row.detectionOutcome,
        row.deviceId ?? "",
        row.selfieBlobUrl ?? "",
        `exception:${row.state}`,
      ]
        .map(escapeCsv)
        .join(",")
    )
  }

  const csv = lines.join("\n") + "\n"
  const filename = `remote-checkin-${input.filters.startDate}_${input.filters.endDate}.csv`

  return { csv, rowCount: lines.length - 1, filename }
}

async function fetchEventRows(conditions: ReturnType<typeof eq>[]): Promise<
  ReadonlyArray<{
    employeeNumber: string | null
    employeeLegalName: string | null
    eventType: string
    occurredAt: Date
    latitude: string | null
    longitude: string | null
    gpsAccuracyMeters: number | null
    deviceId: string | null
    selfieBlobUrl: string | null
    locationVerificationOutcome: string | null
    geofenceCode: string | null
    geofenceLabel: string | null
  }>
> {
  return db
    .select({
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
      eventType: hrmAttendanceEvent.eventType,
      occurredAt: hrmAttendanceEvent.occurredAt,
      latitude: hrmAttendanceEvent.latitude,
      longitude: hrmAttendanceEvent.longitude,
      gpsAccuracyMeters: hrmAttendanceEvent.gpsAccuracyMeters,
      deviceId: hrmAttendanceEvent.deviceId,
      selfieBlobUrl: hrmAttendanceEvent.selfieBlobUrl,
      locationVerificationOutcome:
        hrmAttendanceEvent.locationVerificationOutcome,
      geofenceCode: hrmGeofence.code,
      geofenceLabel: hrmGeofence.label,
    })
    .from(hrmAttendanceEvent)
    .leftJoin(hrmEmployee, eq(hrmEmployee.id, hrmAttendanceEvent.employeeId))
    .leftJoin(hrmGeofence, eq(hrmGeofence.id, hrmAttendanceEvent.geofenceId))
    .where(and(...conditions))
    .orderBy(asc(hrmAttendanceEvent.occurredAt))
}

async function fetchExceptionRows(conditions: ReturnType<typeof eq>[]): Promise<
  ReadonlyArray<{
    employeeNumber: string | null
    employeeLegalName: string | null
    state: string
    eventType: string
    occurredAt: Date
    latitude: string | null
    longitude: string | null
    gpsAccuracyMeters: number | null
    deviceId: string | null
    selfieBlobUrl: string | null
    detectionOutcome: string
    geofenceCode: string | null
    geofenceLabel: string | null
  }>
> {
  return db
    .select({
      employeeNumber: hrmEmployee.employeeNumber,
      employeeLegalName: hrmEmployee.legalName,
      state: hrmRemoteCheckinException.state,
      eventType: hrmRemoteCheckinException.eventType,
      occurredAt: hrmRemoteCheckinException.occurredAt,
      latitude: hrmRemoteCheckinException.latitude,
      longitude: hrmRemoteCheckinException.longitude,
      gpsAccuracyMeters: hrmRemoteCheckinException.gpsAccuracyMeters,
      deviceId: hrmRemoteCheckinException.deviceId,
      selfieBlobUrl: hrmRemoteCheckinException.selfieBlobUrl,
      detectionOutcome: hrmRemoteCheckinException.detectionOutcome,
      geofenceCode: hrmGeofence.code,
      geofenceLabel: hrmGeofence.label,
    })
    .from(hrmRemoteCheckinException)
    .leftJoin(
      hrmEmployee,
      eq(hrmEmployee.id, hrmRemoteCheckinException.employeeId)
    )
    .leftJoin(
      hrmGeofence,
      eq(hrmGeofence.id, hrmRemoteCheckinException.geofenceId)
    )
    .where(and(...conditions))
    .orderBy(asc(hrmRemoteCheckinException.occurredAt))
}
