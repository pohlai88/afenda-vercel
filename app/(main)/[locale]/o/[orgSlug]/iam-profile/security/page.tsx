import type { Metadata } from "next"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"

import { auth, requireAuthShellSignedInSession } from "#lib/auth"
import {
  hasCredentialAccount,
  listDeviceSessions,
  listUserSecurityActivity,
} from "#features/iam-profile/server"
import { generateIamProfileSecurityMetadata } from "#features/iam-profile/server"
import { AppShellSurface } from "#app-shell"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"
import { IamProfileSecurityClient } from "#components2/iam-profile/iam-profile-security.client"
import type {
  IamProfileSecurityActivityRow,
  IamProfileSecuritySessionRow,
} from "#components2/iam-profile/iam-profile.types.shared"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  return generateIamProfileSecurityMetadata(params)
}

function toIso(d: Date | string): string {
  if (d instanceof Date) return d.toISOString()
  return typeof d === "string" ? d : new Date(d).toISOString()
}

export default async function OrganizationIamProfileSecurityPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await requireAuthShellSignedInSession()

  const [
    tSurface,
    t,
    { data: rawSession },
    sessionsRaw,
    activityRaw,
    hasCredential,
  ] = await Promise.all([
    getTranslations("IamProfileSurface"),
    getTranslations("IamProfileSurface.security"),
    auth.getSession({ fetchOptions: { headers: await headers() } }),
    listDeviceSessions(),
    listUserSecurityActivity(session.userId),
    hasCredentialAccount(session.userId),
  ])

  const currentSessionToken = rawSession?.session?.token ?? ""

  const sessions: IamProfileSecuritySessionRow[] = sessionsRaw.map((s) => ({
    id: s.id,
    token: s.token,
    createdAt: toIso(s.createdAt),
    expiresAt: toIso(s.expiresAt),
    ipAddress: s.ipAddress ?? null,
    userAgent: s.userAgent ?? null,
  }))

  const activity: IamProfileSecurityActivityRow[] = activityRaw.map((a) => ({
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
        currentSessionId={session.sessionId}
        currentSessionToken={currentSessionToken}
        sessions={sessions}
        activity={activity}
        hasCredential={hasCredential}
      />
    </AppShellSurface>
  )
}
