import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { AppShellSurface } from "#app-shell"
import {
  IamProfileOverviewDangerSection,
  IamProfileOverviewMembershipSection,
  IamProfileOverviewNextSection,
} from "#components2/iam-profile/iam-profile-overview-sections.client"
import {
  IamProfileOverviewNowBand,
  IamProfileOverviewRecentBand,
} from "#components2/iam-profile/iam-profile-overview-bands"
import type { IamProfileMembershipOrgRow } from "#components2/iam-profile/iam-profile-membership-panels.client"
import { organizationNexusPath } from "#features/nexus"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"

import { getProfileShellData } from "../data/profile-shell-data.server"

function formatRecentTimestamp(
  locale: string,
  value: Date | string | null | undefined
): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export default async function IamProfileOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)

  const [t, shellData] = await Promise.all([
    getTranslations("IamProfileSurface"),
    getProfileShellData(),
  ])

  const identityHref = organizationIamProfilePath(orgSlug, "identity") as Route
  const securityHref = organizationIamProfilePath(orgSlug, "security") as Route
  const nexusHref = organizationNexusPath(orgSlug) as Route

  const activeOrganizationId = shellData.activeOrganization?.id ?? null
  const membershipRows: IamProfileMembershipOrgRow[] =
    shellData.organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: org.role,
      isActive: org.id === activeOrganizationId,
      nexusHref: organizationNexusPath(org.slug) as Route,
    }))

  const nowLines = [
    t("overview.now.signedInAs", { email: shellData.summary.email }),
    shellData.summary.emailVerified
      ? t("overview.now.emailVerified")
      : t("overview.now.emailPending"),
    t("overview.now.sessionSummary", {
      count: shellData.summary.sessionCount,
    }),
    shellData.activeOrganization
      ? t("overview.now.workspaceActive", {
          workspace: shellData.activeOrganization.name,
        })
      : t("overview.now.workspaceMissing"),
  ]

  const recentItems = shellData.securityActivity.slice(0, 3).map((item) => {
    const when = formatRecentTimestamp(locale, item.createdAt)
    const detail = [when, item.path].filter(Boolean).join(" · ")
    return {
      id: item.id,
      label: item.label,
      detail,
    }
  })

  return (
    <AppShellSurface
      breadcrumbs={[
        {
          label: t("breadcrumbs.personal"),
          href: organizationIamProfilePath(orgSlug),
        },
        { label: t("overview.title") },
      ]}
      title={t("overview.title")}
      subtitle={t("overview.subtitle")}
    >
      <IamProfileOverviewNowBand
        label={t("overview.nowLabel")}
        lines={nowLines}
      />

      <IamProfileOverviewNextSection
        emailVerified={shellData.summary.emailVerified}
        sessionCount={shellData.summary.sessionCount}
        activeOrgName={shellData.activeOrganization?.name ?? null}
        identityHref={identityHref}
        securityHref={securityHref}
        nexusHref={nexusHref}
      />

      <IamProfileOverviewRecentBand
        label={t("overview.recentLabel")}
        items={recentItems}
        emptyLabel={t("overview.recentEmpty")}
      />

      <IamProfileOverviewMembershipSection organizations={membershipRows} />

      <IamProfileOverviewDangerSection email={shellData.summary.email} />
    </AppShellSurface>
  )
}
