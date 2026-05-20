import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { AppShellCommandPalette } from "#app-shell/client"
import type { UserOrgSummary } from "#features/org-admin"
import { ORG_ADMIN_PATH_SEGMENTS } from "#lib/i18n/org-apps-path.shared"
import { ORG_APPS_MODULES } from "#lib/i18n/org-apps-path.shared"
import {
  organizationAdminPath,
  organizationAppsPath,
} from "#lib/org-apps-module-paths"

export type OrgCommandLayerProps = {
  orgSlug: string
  currentOrgId: string
  userOrgs: UserOrgSummary[]
  showOrgAdmin: boolean
}

export async function OrgCommandLayer({
  orgSlug,
  currentOrgId,
  userOrgs,
  showOrgAdmin,
}: OrgCommandLayerProps) {
  const t = await getTranslations("Dashboard.commandPalette")
  const tNav = await getTranslations("Dashboard.nav")

  const moduleItems = ORG_APPS_MODULES.map((appModule) => ({
    id: `module-${appModule}`,
    label: tNav(appModule),
    href: organizationAppsPath(orgSlug, appModule) as Route,
    keywords: [appModule],
  }))

  const orgItems =
    userOrgs.length > 1
      ? userOrgs.map((org) => ({
          id: `org-${org.id}`,
          label: org.name?.trim() || org.slug,
          href: organizationAppsPath(org.slug, "home") as Route,
          description: org.id === currentOrgId ? t("currentOrg") : undefined,
          keywords: [org.slug],
        }))
      : []

  const adminItems = showOrgAdmin
    ? [...ORG_ADMIN_PATH_SEGMENTS].map((segment) => ({
        id: `admin-${segment}`,
        label: t(`admin.${segment}` as "admin.members"),
        href: organizationAdminPath(orgSlug, segment) as Route,
        keywords: ["admin", segment],
      }))
    : []

  const sections = [
    { heading: t("groupModules"), items: moduleItems },
    ...(orgItems.length > 0
      ? [{ heading: t("groupOrganizations"), items: orgItems }]
      : []),
    ...(adminItems.length > 0
      ? [{ heading: t("groupAdmin"), items: adminItems }]
      : []),
  ]

  return (
    <AppShellCommandPalette
      placeholder={t("placeholder")}
      dialogTitle={t("dialogTitle")}
      dialogDescription={t("dialogDescription")}
      emptyLabel={t("empty")}
      sections={sections}
    />
  )
}
