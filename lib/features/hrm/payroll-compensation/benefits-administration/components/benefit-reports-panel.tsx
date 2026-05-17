import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import {
  buildBenefitCensusReport,
  buildBenefitCostByLegalEntityReport,
  buildBenefitDeductionReconciliationReport,
  buildBenefitEnrollmentByPlanReport,
} from "../data/benefit-reporting.shared"
import { countBenefitPayrollLinesByEnrollmentForPeriod } from "../data/benefit-report.queries.server"
import { resolveEmployeeLegalEntityCode } from "../data/benefit-legal-entity.server"
import { listBenefitPayrollProjectionEnrollmentsForPeriod } from "../data/benefit-enterprise.queries.server"
import type {
  BenefitEnrollmentListRow,
  BenefitLifeEventRow,
  BenefitPlanRow,
} from "../data/benefit-model.shared"

import { BenefitReportsExportActions } from "./benefit-reports-export-actions"

type BenefitReportsPanelProps = {
  organizationId: string
  plans: readonly BenefitPlanRow[]
  enrollments: readonly BenefitEnrollmentListRow[]
  lifeEvents: readonly BenefitLifeEventRow[]
}

export async function BenefitReportsPanel({
  organizationId,
  plans,
  enrollments,
  lifeEvents,
}: BenefitReportsPanelProps) {
  const t = await getTranslations("Dashboard.Hrm.benefits")
  const asOf = new Date().toISOString().slice(0, 10)
  const periodStart = `${asOf.slice(0, 7)}-01`

  const payrollEnrollments =
    await listBenefitPayrollProjectionEnrollmentsForPeriod({
      organizationId,
      periodStart,
      periodEnd: asOf,
    })

  const lineCounts = await countBenefitPayrollLinesByEnrollmentForPeriod({
    organizationId,
    periodStart: new Date(`${periodStart}T12:00:00.000Z`),
    periodEnd: new Date(`${asOf}T12:00:00.000Z`),
  })

  const uniqueEmployeeIds = [
    ...new Set(
      enrollments
        .filter((row) => row.state === "active" || row.state === "suspended")
        .map((row) => row.employeeId)
    ),
  ]
  const legalEntityEntries = await Promise.all(
    uniqueEmployeeIds.map(async (employeeId) => {
      return [
        employeeId,
        await resolveEmployeeLegalEntityCode(
          organizationId,
          employeeId,
          null
        ),
      ] as const
    })
  )
  const legalEntityByEmployeeId = new Map(legalEntityEntries)

  const census = buildBenefitCensusReport({
    plans,
    enrollments,
    lifeEvents,
    payrollEnrollments,
    asOf,
  })
  const byPlan = buildBenefitEnrollmentByPlanReport(enrollments)
  const byEntity = buildBenefitCostByLegalEntityReport({
    enrollments,
    payrollEnrollments,
    legalEntityByEmployeeId,
  })
  const deductions = buildBenefitDeductionReconciliationReport({
    payrollEnrollments,
    payrollLineCountsByEnrollmentId: lineCounts,
  })

  return (
    <div className="flex flex-col gap-6">
      <BenefitReportsExportActions periodStart={periodStart} periodEnd={asOf} />

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("reports.censusTitle")}</CardTitle>
          <CardDescription>{t("reports.censusDescription", { asOf })}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ReportMetric label={t("reports.metricActivePlans")} value={census.activePlanCount} />
          <ReportMetric
            label={t("reports.metricCoveredEmployees")}
            value={census.coveredEmployeeCount}
          />
          <ReportMetric
            label={t("reports.metricPendingEnrollments")}
            value={census.pendingEnrollmentCount}
          />
          <ReportMetric
            label={t("reports.metricEmployeeContributions")}
            value={census.monthlyEmployeeContributionTotal}
          />
          <ReportMetric
            label={t("reports.metricEmployerContributions")}
            value={census.monthlyEmployerContributionTotal}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("reports.byPlanTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {byPlan.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {byPlan.map((row) => (
                <li
                  key={row.benefitId}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span>
                    {row.benefitName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.benefitCode}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {t("reports.planCounts", {
                      active: row.activeCount,
                      pending: row.pendingCount,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("reports.byEntityTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {byEntity.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {byEntity.map((row) => (
                <li
                  key={row.legalEntityCode}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="font-medium">{row.legalEntityCode}</span>
                  <span className="text-muted-foreground">
                    {t("reports.entityTotals", {
                      enrollments: row.enrollmentCount,
                      employee: row.employeeContributionTotal,
                      employer: row.employerContributionTotal,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("reports.deductionsTitle")}</CardTitle>
          <CardDescription>
            {t("reports.deductionsDescription", { periodStart, periodEnd: asOf })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deductions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("reports.deductionRowCount", { count: deductions.length })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReportMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
