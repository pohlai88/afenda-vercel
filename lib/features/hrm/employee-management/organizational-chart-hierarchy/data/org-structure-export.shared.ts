import type { OrgStructureExportRow } from "./org-structure.queries.server"

const CSV_HEADER = [
  "orgUnitCode",
  "orgUnitName",
  "parentOrgUnitCode",
  "costCenterCode",
  "workLocationCode",
  "positionCode",
  "positionTitle",
  "positionHeadcountBudget",
  "positionOccupancyCount",
  "occupancyState",
  "employeeNumber",
  "employeeLabel",
  "managerLabel",
] as const

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function serializeOrgStructureExportCsv(
  rows: readonly OrgStructureExportRow[]
): string {
  const lines = [CSV_HEADER.join(",")]
  for (const row of rows) {
    lines.push(
      [
        row.orgUnitCode,
        row.orgUnitName,
        row.parentOrgUnitCode,
        row.costCenterCode,
        row.workLocationCode,
        row.positionCode,
        row.positionTitle,
        row.positionHeadcountBudget,
        row.positionOccupancyCount,
        row.occupancyState,
        row.employeeNumber,
        row.employeeLabel,
        row.managerLabel,
      ]
        .map(escapeCsvCell)
        .join(",")
    )
  }
  return `${lines.join("\n")}\n`
}
