import type { OrgFwaRequestRow } from "./fwa.types.shared"

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildFwaOperationalReportCsv(
  rows: readonly OrgFwaRequestRow[]
): string {
  const header = [
    "request_id",
    "employee",
    "employee_number",
    "arrangement_type",
    "kind",
    "state",
    "start_date",
    "end_date",
    "requested_at",
    "reason",
    "remote_location",
  ].join(",")

  const body = rows.map((row) => {
    const employee = row.employeeFullName ?? row.employeeId
    const requestedAt = row.requestedAt.toISOString()
    return [
      row.id,
      employee,
      row.employeeNumber ?? "",
      row.arrangementTypeLabel,
      row.arrangementKind,
      row.state,
      row.startDate,
      row.endDate ?? "",
      requestedAt,
      row.reason ?? "",
      row.remoteLocation ?? "",
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(",")
  })

  return [header, ...body].join("\n")
}
