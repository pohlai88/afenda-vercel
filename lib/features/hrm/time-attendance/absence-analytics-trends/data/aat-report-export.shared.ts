import type { AatOrgAnalyticsSnapshot } from "./aat-analytics.queries.server"

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildAatAnalyticsReportCsv(
  snapshot: AatOrgAnalyticsSnapshot
): string {
  const header = [
    "section",
    "label",
    "metric",
    "value",
  ].join(",")

  const summaryRows = [
    ["summary", "period", "period", snapshot.period],
    ["summary", "absence_rate", "rate", snapshot.absenceRate.toFixed(4)],
    ["summary", "lost_workdays", "days", snapshot.lostWorkdays.toFixed(1)],
    ["summary", "absence_frequency", "count", String(snapshot.absenceFrequency)],
    [
      "summary",
      "planned_lost_workdays",
      "days",
      snapshot.plannedLostWorkdays.toFixed(1),
    ],
    [
      "summary",
      "unplanned_lost_workdays",
      "days",
      snapshot.unplannedLostWorkdays.toFixed(1),
    ],
    [
      "summary",
      "availability_rate",
      "rate",
      snapshot.availabilityRate.toFixed(4),
    ],
    ["summary", "coverage_risk", "flag", snapshot.coverageRisk ? "yes" : "no"],
    [
      "summary",
      "holiday_adjacent_absences",
      "count",
      String(snapshot.holidayAdjacentAbsenceCount),
    ],
  ]

  const departmentRows = snapshot.departmentRanking.map((row) => [
    "department",
    row.departmentName,
    "absence_rate",
    row.absenceRate.toFixed(4),
  ])

  const highRiskRows = snapshot.highRiskEmployees.map((row) => [
    "high_risk_employee",
    row.employeeLabel,
    "absence_rate",
    row.absenceRate.toFixed(4),
  ])

  const leaveTypeRows = snapshot.leaveTypeBreakdown.map((row) => [
    "leave_type",
    row.leaveTypeCode,
    "lost_workdays",
    row.lostWorkdays.toFixed(1),
  ])

  const body = [
    ...summaryRows,
    ...departmentRows,
    ...highRiskRows,
    ...leaveTypeRows,
  ].map((cells) => cells.map((cell) => escapeCsvCell(String(cell))).join(","))

  return [header, ...body].join("\n")
}
