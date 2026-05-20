import type { RosterAssignmentRow } from "./sft-assignment.queries.server"

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildSftRosterReportCsv(
  rows: readonly RosterAssignmentRow[],
  labels?: {
    readonly departmentsById?: ReadonlyMap<string, string>
    readonly positionsById?: ReadonlyMap<string, string>
  }
): string {
  const header = [
    "assignment_id",
    "employee",
    "employee_number",
    "department",
    "position",
    "attendance_date",
    "shift_code",
    "shift_name",
    "scheduled_start",
    "scheduled_end",
    "holiday_behavior",
  ].join(",")

  const body = rows.map((row) => {
    const employee = row.employeeFullName ?? row.employeeId
    const department =
      row.currentDepartmentId && labels?.departmentsById
        ? (labels.departmentsById.get(row.currentDepartmentId) ??
          row.currentDepartmentId)
        : (row.currentDepartmentId ?? "")
    const position =
      row.currentPositionId && labels?.positionsById
        ? (labels.positionsById.get(row.currentPositionId) ??
          row.currentPositionId)
        : (row.currentPositionId ?? "")

    return [
      row.id,
      employee,
      row.employeeNumber ?? "",
      department,
      position,
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
