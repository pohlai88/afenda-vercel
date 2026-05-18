import { after } from "next/server"
import { getTranslations } from "next-intl/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { getCrossCountryPayrollReport } from "../data/cross-country-payroll-report.queries.server"
import { buildCrossCountryPayrollReportListSurfaceConfiguration } from "../data/multi-country-payroll-list-surface.server"
import { requireMultiCountryPayrollSearchSession } from "../data/multi-country-payroll-access.server"
import { HRM_MULTI_COUNTRY_PAYROLL_AUDIT } from "../multi-country-payroll.contract"

type CrossCountryPayrollSummaryPanelProps = {
  readonly organizationId: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly reportingCurrency?: string
}

export async function CrossCountryPayrollSummaryPanel({
  organizationId,
  periodStart,
  periodEnd,
  reportingCurrency = "USD",
}: CrossCountryPayrollSummaryPanelProps) {
  const access = await requireMultiCountryPayrollSearchSession()
  if (!access.ok) {
    return null
  }

  if (access.organizationId !== organizationId) {
    return null
  }

  const [t, report] = await Promise.all([
    getTranslations("Dashboard.Hrm.multiCountryPayroll"),
    getCrossCountryPayrollReport({
      organizationId,
      periodStart,
      periodEnd,
      reportingCurrency,
    }),
  ])

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_MULTI_COUNTRY_PAYROLL_AUDIT.report.search,
      actorUserId: access.userId,
      actorSessionId: access.sessionId,
      organizationId: access.organizationId,
      resourceType: "hrm_payroll_cross_country_report",
      resourceId: access.organizationId,
      metadata: {
        periodStart,
        periodEnd,
        rowCount: report.rows.length,
        reportingCurrency: report.reportingCurrency,
      },
    })
  )

  const listConfiguration =
    buildCrossCountryPayrollReportListSurfaceConfiguration(report.rows, {
      empty: t("reportEmpty"),
      colCountry: t("reportColCountry"),
      colLegalEntity: t("reportColLegalEntity"),
      colPeriod: t("reportColPeriod"),
      colPayGroup: t("reportColPayGroup"),
      colCurrency: t("reportColCurrency"),
      colRuns: t("reportColRuns"),
      colGrossPay: t("reportColGrossPay"),
      colNetPay: t("reportColNetPay"),
      colEmployerCost: t("reportColEmployerCost"),
      colEmployerCostReporting: t("reportColEmployerCostReporting"),
    })

  return (
    <GovernedPatternCListSection
      title={t("reportTitle")}
      description={t("reportDescription", {
        from: periodStart,
        to: periodEnd,
        currency: report.reportingCurrency ?? reportingCurrency,
      })}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:multi-country-payroll:cross-country-report"
      resolveConfiguredPermission={false}
      cardClassName="mt-0"
    />
  )
}
