import { after } from "next/server"
import { getTranslations } from "next-intl/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { listCountryPayrollConfigurations } from "../data/country-payroll-config.server"
import { requireMultiCountryPayrollSearchSession } from "../data/multi-country-payroll-access.server"
import { HRM_MULTI_COUNTRY_PAYROLL_AUDIT } from "../multi-country-payroll.contract"

export async function CountryPayrollConfigPanel() {
  const access = await requireMultiCountryPayrollSearchSession()
  if (!access.ok) {
    return null
  }

  const [t, configs] = await Promise.all([
    getTranslations("Dashboard.Hrm.multiCountryPayroll"),
    listCountryPayrollConfigurations(),
  ])

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_MULTI_COUNTRY_PAYROLL_AUDIT.country_config.viewed,
      actorUserId: access.userId,
      actorSessionId: access.sessionId,
      organizationId: access.organizationId,
      resourceType: "hrm_payroll_country_config",
      resourceId: access.organizationId,
      metadata: {
        countryCount: configs.length,
      },
    })
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("configTitle")}</CardTitle>
        <CardDescription>{t("configDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {configs.map((config) => (
            <li
              key={`${config.countryCode}-${config.version}`}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3"
            >
              <div>
                <p className="font-medium">{config.countryCode}</p>
                <p className="text-xs text-muted-foreground">
                  {t("configVersion", { version: config.version })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{config.defaultCurrency}</Badge>
                <Badge variant="secondary">
                  {t("configStatutoryCount", {
                    count: config.statutoryPackTypes.length,
                  })}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
