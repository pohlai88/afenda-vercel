import type { OrgOtmRequestRow } from "./otm.types.shared"

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildOtmOperationalReportCsv(
  rows: readonly OrgOtmRequestRow[]
): string {
  const header = [
    "request_id",
    "employee",
    "work_date",
    "time_range",
    "duration_minutes",
    "day_category",
    "state",
    "requested_at",
  ].join(",")

  const body = rows.map((row) => {
    const employee = row.employeeFullName ?? row.employeeId
    const label = row.employeeNumber
      ? `${employee} (${row.employeeNumber})`
      : employee
    return [
      row.id,
      label,
      row.workDate,
      `${row.startTime}-${row.endTime}`,
      String(row.durationMinutes),
      row.dayCategory,
      row.state,
      row.requestedAt.toISOString(),
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(",")
  })

  return [header, ...body].join("\n")
}
