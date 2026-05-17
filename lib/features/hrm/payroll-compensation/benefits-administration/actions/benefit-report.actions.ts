"use server"

import { requireHrmAdmin } from "../../../hrm-admin-guard.server"
import {
  buildBenefitCensusReport,
  buildBenefitDeductionReconciliationReport,
  buildBenefitEnrollmentByPlanReport,
} from "../data/benefit-reporting.shared"
import { countBenefitPayrollLinesByEnrollmentForPeriod } from "../data/benefit-report.queries.server"
import {
  listBenefitEnrollmentsForOrganization,
  listBenefitPlansForOrganization,
  listLifeEventsForOrganization,
} from "../data/benefit.queries.server"
import { listBenefitPayrollProjectionEnrollmentsForPeriod } from "../data/benefit-enterprise.queries.server"

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export async function exportBenefitCensusCsvAction(): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { organizationId } = gate.session

  const asOf = new Date().toISOString().slice(0, 10)
  const periodStart = `${asOf.slice(0, 7)}-01`
  const [plans, enrollments, lifeEvents, payrollEnrollments] = await Promise.all(
    [
      listBenefitPlansForOrganization(organizationId, { limit: 500 }),
      listBenefitEnrollmentsForOrganization(organizationId, { limit: 2000 }),
      listLifeEventsForOrganization(organizationId, { limit: 500 }),
      listBenefitPayrollProjectionEnrollmentsForPeriod({
        organizationId,
        periodStart,
        periodEnd: asOf,
      }),
    ]
  )

  const census = buildBenefitCensusReport({
    plans,
    enrollments,
    lifeEvents,
    payrollEnrollments,
    asOf,
  })
  const byPlan = buildBenefitEnrollmentByPlanReport(enrollments)

  const lines = [
    "section,metric,value",
    `census,asOf,${csvEscape(census.asOf)}`,
    `census,activePlanCount,${census.activePlanCount}`,
    `census,coveredEmployeeCount,${census.coveredEmployeeCount}`,
    `census,pendingEnrollmentCount,${census.pendingEnrollmentCount}`,
    `census,monthlyEmployeeContributionTotal,${census.monthlyEmployeeContributionTotal}`,
    `census,monthlyEmployerContributionTotal,${census.monthlyEmployerContributionTotal}`,
    "plan,benefitCode,benefitName,activeCount,pendingCount",
    ...byPlan.map(
      (row) =>
        `plan,${csvEscape(row.benefitCode)},${csvEscape(row.benefitName)},${row.activeCount},${row.pendingCount}`
    ),
  ]

  return {
    ok: true,
    csv: lines.join("\n"),
    filename: `benefit-census-${asOf}.csv`,
  }
}

export async function exportBenefitDeductionReconciliationCsvAction(
  periodStart: string,
  periodEnd: string
): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { organizationId } = gate.session

  const payrollEnrollments =
    await listBenefitPayrollProjectionEnrollmentsForPeriod({
      organizationId,
      periodStart,
      periodEnd,
    })
  const lineCounts = await countBenefitPayrollLinesByEnrollmentForPeriod({
    organizationId,
    periodStart: new Date(`${periodStart}T12:00:00.000Z`),
    periodEnd: new Date(`${periodEnd}T12:00:00.000Z`),
  })
  const rows = buildBenefitDeductionReconciliationReport({
    payrollEnrollments,
    payrollLineCountsByEnrollmentId: lineCounts,
  })

  const lines = [
    "enrollmentId,benefitCode,benefitName,employeeId,projectedEmployeeAmount,projectedEmployerAmount,payrollLineCount",
    ...rows.map(
      (row) =>
        [
          row.enrollmentId,
          csvEscape(row.benefitCode),
          csvEscape(row.benefitName),
          row.employeeId,
          row.projectedEmployeeAmount,
          row.projectedEmployerAmount,
          row.payrollLineCount,
        ].join(",")
    ),
  ]

  return {
    ok: true,
    csv: lines.join("\n"),
    filename: `benefit-deductions-${periodStart}-to-${periodEnd}.csv`,
  }
}
