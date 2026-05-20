import type { RosterAssignmentRow } from "./sft-assignment.queries.server"

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildSftRosterReportCsv(
  rows: readonly RosterAssignmentRow[]
): string {
  const header = [
    "assignment_id",
    "employee",
    "attendance_date",
    "shift_code",
    "shift_name",
    "scheduled_start",
    "scheduled_end",
    "holiday_behavior",
  ].join(",")

  const body = rows.map((row) => {
    const employee = row.employeeFullName ?? row.employeeId
    const label = row.employeeNumber
      ? `${employee} (${row.employeeNumber})`
      : employee
    return [
      row.id,
      label,
      row.attendanceDate,
      row.templateCode,
      row.templateName,
      row.scheduledStartAt.toISOString(),
      row.scheduledEndAt.toISOString(),
      row.holidayBehavior,
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(",")
  })

  return [header, ...body].join("\n") + "\n"
}
