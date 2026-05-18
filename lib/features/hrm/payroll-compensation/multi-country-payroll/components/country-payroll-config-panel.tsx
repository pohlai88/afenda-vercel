import { after } from "next/server"
import { getTranslations } from "next-intl/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { listCountryPayrollConfigurations } from "../data/country-payroll-config.server"
import { buildCountryPayrollConfigListSurfaceConfiguration } from "../data/multi-country-payroll-list-surface.server"
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

  const listConfiguration = buildCountryPayrollConfigListSurfaceConfiguration(
    configs,
    {
      empty: t("configEmpty"),
      colCountry: t("configColCountry"),
      colVersion: t("configColVersion"),
      colCurrency: t("configColCurrency"),
      colStatutory: t("configColStatutory"),
      colEffectiveFrom: t("configColEffectiveFrom"),
    }
  )

  return (
    <GovernedPatternCListSection
      title={t("configTitle")}
      description={t("configDescription")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:multi-country-payroll:country-config"
      resolveConfiguredPermission={false}
      cardClassName="mt-0"
    />
  )
}
