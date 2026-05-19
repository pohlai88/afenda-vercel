import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { AppShellSurface } from "#app-shell"
import {
  IamProfileOverviewDangerSection,
  IamProfileOverviewMembershipSection,
  IamProfileOverviewNextSection,
} from "#components2/iam-profile/iam-profile-overview-sections.client"
import { IamProfileContextBand } from "#components2/iam-profile/iam-profile-context-band"
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

  const recentItems = shellData.securityActivity.slice(0, 3)

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
      <IamProfileContextBand label={t("overview.nowLabel")}>
        <div className="space-y-2 text-sm leading-6 text-foreground">
          <p>
            {t("overview.now.signedInAs", { email: shellData.summary.email })}
          </p>
          <p>
            {shellData.summary.emailVerified
              ? t("overview.now.emailVerified")
              : t("overview.now.emailPending")}
          </p>
          <p>
            {t("overview.now.sessionSummary", {
              count: shellData.summary.sessionCount,
            })}
          </p>
          <p>
            {shellData.activeOrganization
              ? t("overview.now.workspaceActive", {
                  workspace: shellData.activeOrganization.name,
                })
              : t("overview.now.workspaceMissing")}
          </p>
        </div>
      </IamProfileContextBand>

      <IamProfileOverviewNextSection
        emailVerified={shellData.summary.emailVerified}
        sessionCount={shellData.summary.sessionCount}
        activeOrgName={shellData.activeOrganization?.name ?? null}
        identityHref={identityHref}
        securityHref={securityHref}
        nexusHref={nexusHref}
      />

      <IamProfileContextBand label={t("overview.recentLabel")}>
        {recentItems.length > 0 ? (
          <ul className="space-y-3 text-sm">
            {recentItems.map((item) => (
              <li key={item.id} className="space-y-1">
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-muted-foreground">
                  {formatRecentTimestamp(locale, item.createdAt)}
                  {item.path ? ` · ${item.path}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("overview.recentEmpty")}
          </p>
        )}
      </IamProfileContextBand>

      <IamProfileOverviewMembershipSection organizations={membershipRows} />

      <IamProfileOverviewDangerSection email={shellData.summary.email} />
    </AppShellSurface>
  )
}
