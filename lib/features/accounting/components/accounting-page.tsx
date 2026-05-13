import { getTranslations } from "next-intl/server"

import {
  GovernedSection,
  GovernedSurface,
  parsePageHeaderData,
} from "#features/governed-surface"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"

const ACCOUNTING_FOUNDATION_STEPS = [
  "chartOfAccounts",
  "fiscalPeriods",
  "taxProfile",
] as const

export async function AccountingPage({ orgSlug }: { orgSlug: string }) {
  const [t, tNav] = await Promise.all([
    getTranslations("Accounting.foundation"),
    getTranslations("Dashboard.nav"),
  ])
  const nexusHref = organizationDashboardPath(orgSlug, "home")

  const headerParsed = parsePageHeaderData({
    eyebrow: t("eyebrow"),
    title: tNav("accounting"),
    description: t("description"),
    backHref: nexusHref,
    backLabel: t("backToNexus"),
  })
  if (!headerParsed.success) {
    throw new Error("AccountingPage: invalid governed page header payload")
  }

  return (
    <GovernedSurface header={headerParsed.data}>
      <div className="grid gap-4 lg:grid-cols-3">
        {ACCOUNTING_FOUNDATION_STEPS.map((step) => (
          <GovernedSection
            key={step}
            title={t(`steps.${step}.title`)}
            description={t(`steps.${step}.description`)}
          >
            <p className="text-sm text-muted-foreground">
              {t(`steps.${step}.status`)}
            </p>
          </GovernedSection>
        ))}
      </div>
    </GovernedSurface>
  )
}
