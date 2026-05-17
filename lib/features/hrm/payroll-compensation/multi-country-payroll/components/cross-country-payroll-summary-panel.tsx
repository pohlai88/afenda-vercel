import { after } from "next/server"
import { getTranslations } from "next-intl/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { getCrossCountryPayrollReport } from "../data/cross-country-payroll-report.queries.server"
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

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("reportTitle")}</CardTitle>
        <CardDescription>
          {t("reportDescription", {
            from: periodStart,
            to: periodEnd,
            currency: report.reportingCurrency ?? reportingCurrency,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("reportEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t("reportColCountry")}</th>
                  <th className="py-2 pr-3 font-medium">{t("reportColPeriod")}</th>
                  <th className="py-2 pr-3 font-medium">{t("reportColCurrency")}</th>
                  <th className="py-2 pr-3 font-medium text-right">
                    {t("reportColEmployerCost")}
                  </th>
                  {report.reportingCurrency ? (
                    <th className="py-2 font-medium text-right">
                      {t("reportColEmployerCostReporting")}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    key={`${row.periodId}-${row.countryCode}-${row.payCurrency}-${row.payrollGroupCode}`}
                    className="border-b border-border/60"
                  >
                    <td className="py-2 pr-3 font-medium">{row.countryCode}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {row.periodStart} – {row.periodEnd}
                    </td>
                    <td className="py-2 pr-3">{row.payCurrency}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {row.employerCost}
                    </td>
                    {report.reportingCurrency ? (
                      <td className="py-2 text-right tabular-nums">
                        {row.employerCostReporting ?? "—"}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
