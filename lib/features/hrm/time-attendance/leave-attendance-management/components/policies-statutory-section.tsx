import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { isoDateOnlyToUtcDate } from "../../../_module-governance/hrm-calendar-dates.server"
import { listLegalEntityPayrollConfigs } from "../../../payroll-compensation/multi-country-payroll/data/legal-entity-payroll.queries.server"
import { resolveRulePack } from "../../../payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server"

export async function PoliciesStatutorySection() {
  const [orgSession, t] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.policies"),
  ])

  const configs = await listLegalEntityPayrollConfigs(orgSession.organizationId)
  const countryCode =
    configs[0]?.payrollCountryCode?.toUpperCase() ??
    configs[0]?.countryCode?.toUpperCase() ??
    "MY"

  const year = new Date().getUTCFullYear()
  let holidays: { date: string; name: string }[] = []
  let packVersion = "—"
  let packError: string | null = null

  try {
    const pack = resolveRulePack(
      countryCode,
      isoDateOnlyToUtcDate(`${year}-01-01`)
    )
    packVersion = pack.version
    holidays = pack.publicHolidays(year, []).map((h) => ({
      date: h.date,
      name: h.nameKey,
    }))
  } catch {
    packError = t("statutory.unsupportedCountry", { country: countryCode })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("statutory.title")}</CardTitle>
        <CardDescription>
          {t("statutory.description", { country: countryCode, version: packVersion })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {packError ? (
          <p className="text-sm text-muted-foreground">{packError}</p>
        ) : holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("statutory.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">{t("statutory.colDate")}</th>
                  <th className="pb-2 font-medium">{t("statutory.colName")}</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((row) => (
                  <tr key={row.date} className="border-b border-border/60">
                    <td className="py-2 pr-4 tabular-nums">{row.date}</td>
                    <td className="py-2">{row.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t("statutory.readOnlyHint")}</p>
      </CardContent>
    </Card>
  )
}
