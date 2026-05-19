import "server-only"

import { getTranslations } from "next-intl/server"

import { AppShellSurface } from "#app-shell"
import { IamProfileSecurityClient } from "#components2/iam-profile/iam-profile-security.client"
import type {
  IamProfileSecurityActivityRow,
  IamProfileSecuritySessionRow,
} from "#components2/iam-profile/iam-profile.types.shared"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"

import { getProfileShellData } from "../data/profile-shell-data.server"

function toIso(d: Date | string): string {
  if (d instanceof Date) return d.toISOString()
  return typeof d === "string" ? d : new Date(d).toISOString()
}

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

  const sessions: IamProfileSecuritySessionRow[] = shellData.deviceSessions.map(
    (s) => ({
      id: s.id,
      token: s.token,
      createdAt: toIso(s.createdAt),
      expiresAt: toIso(s.expiresAt),
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
    })
  )

  const activity: IamProfileSecurityActivityRow[] =
    shellData.securityActivity.map((a) => ({
      id: a.id,
      label: a.label,
      createdAt: toIso(a.createdAt),
      path: a.path,
    }))

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
      <IamProfileSecurityClient
        currentSessionId={shellData.currentSessionId}
        currentSessionToken={shellData.currentSessionToken}
        sessions={sessions}
        activity={activity}
        hasCredential={shellData.hasCredential}
      />
    </AppShellSurface>
  )
}
