import type { Metadata } from "next"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"

import {
  listDeviceSessions,
  listUserSecurityActivity,
  requireAuthShellSignedInSession,
} from "#lib/auth"

import {
  AccountSecurityCenterClient,
  type SecurityActivityRow,
  type SecurityPasskeyRow,
  type SecuritySessionRow,
} from "../../../../(iam)/account/security/security-center-client"
import { auth } from "#lib/auth"
import { AppShellSurface } from "#app-shell"
import { organizationAccountPath } from "#lib/dashboard-module-paths"
import { generateAccountSecurityMetadata } from "../../../../(iam)/account/account-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  return generateAccountSecurityMetadata(params)
}

function toIso(d: Date | string): string {
  if (d instanceof Date) return d.toISOString()
  return typeof d === "string" ? d : new Date(d).toISOString()
}

export default async function OrganizationAccountSecurityPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const tSurface = await getTranslations("AccountSurface")
  const t = await getTranslations("AccountSurface.security")
  const session = await requireAuthShellSignedInSession()
  const { data: rawSession } = await auth.getSession({
    fetchOptions: { headers: await headers() },
  })
  const currentSessionToken = rawSession?.session?.token ?? ""

  const [sessionsRaw, activityRaw] = await Promise.all([
    listDeviceSessions(),
    listUserSecurityActivity(session.userId),
  ])

  const sessions: SecuritySessionRow[] = sessionsRaw.map((s) => ({
    id: s.id,
    token: s.token,
    createdAt: toIso(s.createdAt),
    expiresAt: toIso(s.expiresAt),
    ipAddress: s.ipAddress ?? null,
    userAgent: s.userAgent ?? null,
  }))

  const passkeys: SecurityPasskeyRow[] = []

  const activity: SecurityActivityRow[] = activityRaw.map((a) => ({
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
          href: organizationAccountPath(orgSlug),
        },
        { label: t("title") },
      ]}
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <AccountSecurityCenterClient
        currentSessionId={session.sessionId}
        currentSessionToken={currentSessionToken}
        sessions={sessions}
        passkeys={passkeys}
        activity={activity}
      />
    </AppShellSurface>
  )
}
