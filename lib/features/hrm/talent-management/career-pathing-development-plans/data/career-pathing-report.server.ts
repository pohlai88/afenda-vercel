import "server-only"

import { listLatestReadinessForOrg } from "./career-pathing.queries.server"

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const READINESS_CSV_HEADER = [
  "employee_id",
  "employee_name",
  "target_role",
  "readiness_level",
  "progress_percent",
] as const

/** HRM-CAR-029 — readiness export by department/job family via latest snapshot rows. */
export async function buildCareerPathReadinessExportCsv(
  organizationId: string
): Promise<{ csv: string; rowCount: number; filename: string }> {
  const rows = await listLatestReadinessForOrg(organizationId)
  const lines: string[] = [READINESS_CSV_HEADER.join(",")]

  for (const row of rows) {
    lines.push(
      [
        escapeCsvCell(row.employeeId),
        escapeCsvCell(row.employeeName),
        escapeCsvCell(row.targetRoleTitle ?? ""),
        escapeCsvCell(row.readinessLevel),
        escapeCsvCell(String(row.progressPercent)),
      ].join(",")
    )
  }

  const stamp = new Date().toISOString().slice(0, 10)
  return {
    csv: `${lines.join("\n")}\n`,
    rowCount: rows.length,
    filename: `career-path-readiness-${stamp}.csv`,
  }
}
