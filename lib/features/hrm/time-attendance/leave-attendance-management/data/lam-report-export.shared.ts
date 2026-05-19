import type { OrgAttendanceEventRow } from "./attendance.queries.server"
import type { OrgLeaveRequestRow } from "./leave-request.queries.server"

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildLeaveRequestsReportCsv(
  rows: readonly OrgLeaveRequestRow[]
): string {
  const header = [
    "request_id",
    "employee_number",
    "employee_name",
    "leave_type",
    "state",
    "start_date",
    "end_date",
    "duration_days",
    "half_day",
    "requested_at",
    "reason",
  ].join(",")

  const body = rows.map((row) =>
    [
      row.id,
      row.employeeNumber ?? "",
      row.employeeFullName ?? "",
      row.leaveTypeCode ?? "",
      row.state,
      row.startDate,
      row.endDate,
      row.durationDays,
      row.halfDay,
      row.requestedAt.toISOString(),
      row.reason ?? "",
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(",")
  )

  return [header, ...body].join("\n")
}

export function buildAttendanceEventsReportCsv(
  rows: readonly OrgAttendanceEventRow[]
): string {
  const header = [
    "event_id",
    "employee_number",
    "employee_name",
    "event_type",
    "occurred_at",
    "source",
    "correction_reason",
  ].join(",")

  const body = rows.map((row) =>
    [
      row.id,
      row.employeeNumber ?? "",
      row.employeeFullName ?? "",
      row.eventType,
      row.occurredAt.toISOString(),
      row.source,
      row.correctionReason ?? "",
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(",")
  )

  return [header, ...body].join("\n")
}
