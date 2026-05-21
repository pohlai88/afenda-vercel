import "server-only"

import { and, asc, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmAttendanceEvent,
  hrmEmployee,
  hrmTimeClockDevice,
  hrmTimeClockPunchException,
  hrmTimeClockSyncBatch,
} from "#lib/db/schema"

import type { ExportTimeClockReportFormInput } from "../schemas/tci.schema"

const CSV_HEADER = [
  "row_kind",
  "attendance_date",
  "employee_number",
  "employee_legal_name",
  "external_device_id",
  "device_name",
  "event_type",
  "occurred_at",
  "source_ref",
  "sync_batch_id",
  "detection_outcome",
  "exception_state",
  "exception_reason",
] as const

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return ""
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export type TimeClockReportCsv = {
  readonly csv: string
  readonly rowCount: number
  readonly filename: string
}

export async function buildTimeClockReportCsv(input: {
  organizationId: string
  filters: ExportTimeClockReportFormInput
}): Promise<TimeClockReportCsv> {
  const { organizationId } = input
  const start = new Date(`${input.filters.startDate}T00:00:00.000Z`)
  const end = new Date(`${input.filters.endDate}T23:59:59.999Z`)

  const lines: string[] = [CSV_HEADER.join(",")]
  let rowCount = 0

  if (!input.filters.onlyExceptions) {
    const eventConditions = [
      eq(hrmAttendanceEvent.organizationId, organizationId),
      eq(hrmAttendanceEvent.source, "device"),
      gte(hrmAttendanceEvent.occurredAt, start),
      lte(hrmAttendanceEvent.occurredAt, end),
    ]
    if (input.filters.employeeId) {
      eventConditions.push(
        eq(hrmAttendanceEvent.employeeId, input.filters.employeeId)
      )
    }
    if (input.filters.deviceId) {
      eventConditions.push(eq(hrmAttendanceEvent.deviceId, input.filters.deviceId))
    }

    const punchRows = await db
      .select({
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        externalDeviceId: hrmTimeClockDevice.externalDeviceId,
        deviceName: hrmTimeClockDevice.name,
        eventType: hrmAttendanceEvent.eventType,
        occurredAt: hrmAttendanceEvent.occurredAt,
        sourceRef: hrmAttendanceEvent.sourceRef,
        metadata: hrmAttendanceEvent.metadata,
      })
      .from(hrmAttendanceEvent)
      .innerJoin(
        hrmEmployee,
        eq(hrmAttendanceEvent.employeeId, hrmEmployee.id)
      )
      .leftJoin(
        hrmTimeClockDevice,
        eq(hrmAttendanceEvent.deviceId, hrmTimeClockDevice.id)
      )
      .where(and(...eventConditions))
      .orderBy(asc(hrmAttendanceEvent.occurredAt))

    for (const row of punchRows) {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as { syncBatchId?: string | null })
          : null
      const attendanceDate = row.occurredAt.toISOString().slice(0, 10)
      lines.push(
        [
          "punch",
          attendanceDate,
          row.employeeNumber,
          row.legalName,
          row.externalDeviceId,
          row.deviceName,
          row.eventType,
          row.occurredAt.toISOString(),
          row.sourceRef,
          metadata?.syncBatchId ?? "",
          "",
          "",
          "",
        ]
          .map(escapeCsv)
          .join(",")
      )
      rowCount += 1
    }
  }

  const exceptionConditions = [
    eq(hrmTimeClockPunchException.organizationId, organizationId),
    gte(hrmTimeClockPunchException.occurredAt, start),
    lte(hrmTimeClockPunchException.occurredAt, end),
  ]
  if (input.filters.employeeId) {
    exceptionConditions.push(
      eq(hrmTimeClockPunchException.employeeId, input.filters.employeeId)
    )
  }
  if (input.filters.deviceId) {
    exceptionConditions.push(
      eq(hrmTimeClockPunchException.deviceId, input.filters.deviceId)
    )
  }

  const exceptionRows = await db
    .select({
      attendanceDate: hrmTimeClockPunchException.occurredAt,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      externalDeviceId: hrmTimeClockDevice.externalDeviceId,
      deviceName: hrmTimeClockDevice.name,
      eventType: hrmTimeClockPunchException.eventType,
      occurredAt: hrmTimeClockPunchException.occurredAt,
      sourceRef: hrmTimeClockPunchException.sourceRef,
      syncBatchId: hrmTimeClockPunchException.syncBatchId,
      detectionOutcome: hrmTimeClockPunchException.detectionOutcome,
      state: hrmTimeClockPunchException.state,
      reason: hrmTimeClockPunchException.reason,
    })
    .from(hrmTimeClockPunchException)
    .innerJoin(
      hrmEmployee,
      eq(hrmTimeClockPunchException.employeeId, hrmEmployee.id)
    )
    .leftJoin(
      hrmTimeClockDevice,
      eq(hrmTimeClockPunchException.deviceId, hrmTimeClockDevice.id)
    )
    .where(and(...exceptionConditions))
    .orderBy(asc(hrmTimeClockPunchException.occurredAt))

  for (const row of exceptionRows) {
    const attendanceDate = row.occurredAt.toISOString().slice(0, 10)
    lines.push(
      [
        "exception",
        attendanceDate,
        row.employeeNumber,
        row.legalName,
        row.externalDeviceId,
        row.deviceName,
        row.eventType,
        row.occurredAt.toISOString(),
        row.sourceRef,
        row.syncBatchId,
        row.detectionOutcome,
        row.state,
        row.reason,
      ]
        .map(escapeCsv)
        .join(",")
    )
    rowCount += 1
  }

  if (!input.filters.onlyExceptions) {
    const batchRows = await db
      .select({
        id: hrmTimeClockSyncBatch.id,
        sourceKind: hrmTimeClockSyncBatch.sourceKind,
        state: hrmTimeClockSyncBatch.state,
        receivedCount: hrmTimeClockSyncBatch.receivedCount,
        acceptedCount: hrmTimeClockSyncBatch.acceptedCount,
        duplicateCount: hrmTimeClockSyncBatch.duplicateCount,
        rejectedCount: hrmTimeClockSyncBatch.rejectedCount,
        startedAt: hrmTimeClockSyncBatch.startedAt,
        finishedAt: hrmTimeClockSyncBatch.finishedAt,
        externalDeviceId: hrmTimeClockDevice.externalDeviceId,
        deviceName: hrmTimeClockDevice.name,
      })
      .from(hrmTimeClockSyncBatch)
      .leftJoin(
        hrmTimeClockDevice,
        eq(hrmTimeClockSyncBatch.deviceId, hrmTimeClockDevice.id)
      )
      .where(
        and(
          eq(hrmTimeClockSyncBatch.organizationId, organizationId),
          gte(hrmTimeClockSyncBatch.startedAt, start),
          lte(hrmTimeClockSyncBatch.startedAt, end)
        )
      )
      .orderBy(asc(hrmTimeClockSyncBatch.startedAt))

    for (const row of batchRows) {
      lines.push(
        [
          "sync_batch",
          row.startedAt.toISOString().slice(0, 10),
          "",
          "",
          row.externalDeviceId,
          row.deviceName,
          row.sourceKind,
          row.startedAt.toISOString(),
          row.id,
          "",
          row.state,
          `received=${row.receivedCount};accepted=${row.acceptedCount};duplicate=${row.duplicateCount};rejected=${row.rejectedCount}`,
          row.finishedAt?.toISOString() ?? "",
        ]
          .map(escapeCsv)
          .join(",")
      )
      rowCount += 1
    }
  }

  const filename = `time-clock-report-${input.filters.startDate}_${input.filters.endDate}.csv`
  return { csv: `${lines.join("\n")}\n`, rowCount, filename }
}
