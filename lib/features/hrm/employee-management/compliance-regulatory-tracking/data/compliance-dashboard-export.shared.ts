import type { ComplianceDashboardRow } from "./compliance-dashboard.shared"

export function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export function buildComplianceDashboardCsv(
  rows: readonly ComplianceDashboardRow[]
): string {
  const header = [
    "employeeNumber",
    "legalName",
    "overallStatus",
    "legalEntityCode",
    "workLocationCode",
    "employmentType",
    "workerCategory",
    "openExceptions",
    "documentMissing",
    "documentExpired",
    "trainingOverdue",
    "missingAcknowledgements",
  ].join(",")

  const body = rows.map((row) =>
    [
      csvEscape(row.employeeNumber),
      csvEscape(row.legalName),
      csvEscape(row.overallStatus),
      csvEscape(row.legalEntityCode ?? ""),
      csvEscape(row.workLocationCode ?? ""),
      csvEscape(row.employmentType ?? ""),
      csvEscape(row.workerCategory ?? ""),
      String(row.openExceptionCount),
      String(row.documentMissing),
      String(row.documentExpired),
      String(row.trainingOverdue),
      String(row.missingAcknowledgementCount),
    ].join(",")
  )

  return [header, ...body].join("\n")
}
