import type { OrgTimeReportRow } from "./time-report.queries.server"

export function formatTimeReportEmployeeCell(row: OrgTimeReportRow): string {
  const name = row.employeeFullName ?? row.employeeId
  return row.employeeNumber ? `${name} · ${row.employeeNumber}` : name
}

export function formatTimeReportDetail(row: OrgTimeReportRow): string {
  if (row.reportKind === "overtime") {
    const minutes = row.overtimeMinutes ?? 0
    return `${row.workDate ?? "—"} · ${minutes} min`
  }
  return `${row.tripStartDate ?? "—"} → ${row.tripEndDate ?? "—"}`
}
