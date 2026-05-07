import type { Route } from "next"
import { redirect } from "next/navigation"

import {
  listDeviceSessions,
  listUserPasskeys,
  listUserSecurityActivity,
} from "#lib/auth"
import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { getAuthSessionTrusted } from "#lib/session-cache"

import {
  AccountSecurityCenterClient,
  type SecurityActivityRow,
  type SecurityPasskeyRow,
  type SecuritySessionRow,
} from "./security-center-client"

function toIso(d: Date | string): string {
  if (d instanceof Date) return d.toISOString()
  return typeof d === "string" ? d : new Date(d).toISOString()
}

export default async function AccountSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const session = await getAuthSessionTrusted()
  if (!session?.user?.id || !session.session) {
    const q = encodeURIComponent(
      resolvePostAuthCallbackUrl(toLocalePath(locale, "/account/security"))
    )
    redirect(`${toLocalePath(locale, "/sign-in")}?callbackUrl=${q}` as Route)
  }

  const userId = session.user.id
  const [sessionsRaw, passkeysRaw, activityRaw] = await Promise.all([
    listDeviceSessions(),
    listUserPasskeys(),
    listUserSecurityActivity(userId),
  ])

  const sessions: SecuritySessionRow[] = sessionsRaw.map((s) => ({
    id: s.id,
    token: s.token,
    createdAt: toIso(s.createdAt),
    expiresAt: toIso(s.expiresAt),
    ipAddress: s.ipAddress ?? null,
    userAgent: s.userAgent ?? null,
  }))

  const passkeys: SecurityPasskeyRow[] = passkeysRaw.map((p) => ({
    id: p.id,
    name: p.name ?? null,
    createdAt: p.createdAt ? toIso(p.createdAt) : null,
  }))

  const activity: SecurityActivityRow[] = activityRaw.map((a) => ({
    id: a.id,
    label: a.label,
    createdAt: toIso(a.createdAt),
    path: a.path,
  }))

  return (
    <AccountSecurityCenterClient
      currentSessionId={session.session.id}
      currentSessionToken={session.session.token}
      sessions={sessions}
      passkeys={passkeys}
      activity={activity}
    />
  )
}
