import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { requireOrgSession } from "#lib/auth"

import { listActiveContractsForOnboardingDashboard } from "../data/onboarding.queries.server"
import { resolveOnboardingSurfaceCapabilities } from "../data/employee-lifecycle-capabilities.server"

import { HrmOnboardingSection } from "./hrm-onboarding-section"

type HrmOnboardingPageProps = {
  orgSlug: string
}

export async function HrmOnboardingPage({ orgSlug }: HrmOnboardingPageProps) {
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.onboarding")
  const capabilities = await resolveOnboardingSurfaceCapabilities()

  const rows = capabilities.canRead
    ? await listActiveContractsForOnboardingDashboard(session.organizationId)
    : []

  return (
    <div className="p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <HrmOnboardingSection
        orgSlug={orgSlug}
        rows={rows}
        canRead={capabilities.canRead}
        canUpdate={capabilities.canUpdate}
      />
    </div>
  )
}
