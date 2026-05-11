import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"
import {
  listDeviceSessions,
  listUserSecurityActivity,
  requireAuthShellSignedInSession,
} from "#lib/auth"
import { Link } from "#i18n/navigation"

import {
  AccountSecurityCenterClient,
  type SecurityActivityRow,
  type SecurityPasskeyRow,
  type SecuritySessionRow,
} from "./security-center-client"
import { auth } from "#lib/auth"
import { AccountSurface } from "../_components/account-surface"

function toIso(d: Date | string): string {
  if (d instanceof Date) return d.toISOString()
  return typeof d === "string" ? d : new Date(d).toISOString()
}

export default async function AccountSecurityPage() {
  const tSurface = await getTranslations("AccountSurface")
  const t = await getTranslations("AccountSurface.security")
  const session = await requireAuthShellSignedInSession()
  const { data: rawSession } = await auth.getSession()
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

  // Neon Auth currently does not expose a passkey list API server-side.
  const passkeys: SecurityPasskeyRow[] = []

  const activity: SecurityActivityRow[] = activityRaw.map((a) => ({
    id: a.id,
    label: a.label,
    createdAt: toIso(a.createdAt),
    path: a.path,
  }))

  return (
    <AccountSurface
      breadcrumbs={[
        { label: tSurface("breadcrumbs.personal"), href: "/account" },
        { label: t("title") },
      ]}
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/account/security#sessions">
              {t("actions.sessions")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account/security#passkeys">
              {t("actions.passkeys")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account/security#two-factor">
              {t("actions.twoFactor")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account/security#recent-activity">
              {t("actions.recent")}
            </Link>
          </Button>
        </>
      }
    >
      <AccountSecurityCenterClient
        currentSessionId={session.sessionId}
        currentSessionToken={currentSessionToken}
        sessions={sessions}
        passkeys={passkeys}
        activity={activity}
      />
    </AccountSurface>
  )
}
