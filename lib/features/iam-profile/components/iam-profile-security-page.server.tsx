import "server-only"

import { getTranslations } from "next-intl/server"

import { AppShellSurface } from "#app-shell"
import { IamProfileSecurityClient } from "#components2/iam-profile/iam-profile-security.client"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"

import { getProfileShellData } from "../data/profile-shell-data.server"
import { buildIamProfileSecurityViewFromShell } from "../data/profile-security-view.server"

export default async function IamProfileSecurityPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params

  const [tSurface, t, shellData] = await Promise.all([
    getTranslations("IamProfileSurface"),
    getTranslations("IamProfileSurface.security"),
    getProfileShellData(),
  ])

  const securityView = buildIamProfileSecurityViewFromShell(shellData)

  return (
    <AppShellSurface
      breadcrumbs={[
        {
          label: tSurface("breadcrumbs.personal"),
          href: organizationIamProfilePath(orgSlug),
        },
        { label: t("title") },
      ]}
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <IamProfileSecurityClient {...securityView} />
    </AppShellSurface>
  )
}
