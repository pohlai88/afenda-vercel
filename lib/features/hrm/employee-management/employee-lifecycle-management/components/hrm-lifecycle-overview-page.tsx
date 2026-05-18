import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { requireOrgSession } from "#lib/auth"

import { resolveLifecycleOverviewSurfaceCapabilities } from "../data/employee-lifecycle-capabilities.server"
import { getEmployeeLifecycleReadinessCounts } from "../data/employee-lifecycle-overview.queries.server"

import { HrmLifecycleOverviewSection } from "./hrm-lifecycle-overview-section"
import { HrmLifecycleReadinessStrip } from "./hrm-lifecycle-readiness-strip"

type HrmLifecycleOverviewPageProps = {
  orgSlug: string
}

export async function HrmLifecycleOverviewPage({
  orgSlug,
}: HrmLifecycleOverviewPageProps) {
  const [session, t, capabilities] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.lifecycle"),
    resolveLifecycleOverviewSurfaceCapabilities(),
  ])

  const readinessCounts = capabilities.canRead
    ? await getEmployeeLifecycleReadinessCounts(session.organizationId)
    : {
        onboardingOpen: 0,
        offboardingOpen: 0,
        probationDue: 0,
        contractExpiryDue: 0,
        pendingTransitions: 0,
      }

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {capabilities.canRead ? (
        <HrmLifecycleReadinessStrip
          orgSlug={orgSlug}
          counts={readinessCounts}
        />
      ) : null}

      <HrmLifecycleOverviewSection
        orgSlug={orgSlug}
        organizationId={session.organizationId}
        canRead={capabilities.canRead}
      />
    </div>
  )
}
