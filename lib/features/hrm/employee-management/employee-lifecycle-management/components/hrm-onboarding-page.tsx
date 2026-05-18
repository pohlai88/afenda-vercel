import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { requireOrgSession } from "#lib/auth"

import { resolveOnboardingSurfaceCapabilities } from "../data/employee-lifecycle-capabilities.server"

import { HrmOnboardingSection } from "./hrm-onboarding-section"

type HrmOnboardingPageProps = {
  orgSlug: string
}

export async function HrmOnboardingPage({ orgSlug }: HrmOnboardingPageProps) {
  const [session, t, capabilities] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.onboarding"),
    resolveOnboardingSurfaceCapabilities(),
  ])

  return (
    <div className="p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <HrmOnboardingSection
        orgSlug={orgSlug}
        organizationId={session.organizationId}
        canRead={capabilities.canRead}
        canUpdate={capabilities.canUpdate}
      />
    </div>
  )
}
