import type { Route } from "next"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { AuthResult } from "#components2/auth/auth-result"
import { getAuthShellSignedInSessionOrNull } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

import { AcceptInvitationClient } from "#components2/auth/accept-invitation-client"

export default async function AcceptInvitationPage({
  params,
  searchParams,
}: PageProps<"/[locale]/accept-invitation">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const raw = sp.invitationId
  const invitationId = Array.isArray(raw) ? raw[0] : raw
  if (!invitationId?.trim()) {
    return (
      <AuthPageFrame>
        <AuthResult
          variant="warning"
          title="Missing invitation"
          description="Open the link from your invitation email, or ask your administrator to send a new invite."
          primaryAction={{
            label: "Back to sign in",
            href: "/sign-in" as Route,
          }}
        />
      </AuthPageFrame>
    )
  }

  const session = await getAuthShellSignedInSessionOrNull()
  if (!session) {
    const inviteHref = `${toLocalePath(locale, "/accept-invitation")}?invitationId=${encodeURIComponent(invitationId.trim())}`
    const signInHref = `${toLocalePath(locale, "/sign-in")}?callbackUrl=${encodeURIComponent(inviteHref)}`

    return (
      <AuthPageFrame>
        <AuthResult
          variant="neutral"
          title="Sign in to review invitation"
          description="Use the invited account first. After sign-in, you will return here to accept or reject the organization invitation."
          primaryAction={{
            label: "Sign in",
            href: signInHref as Route,
          }}
          secondaryAction={{
            label: "Go home",
            href: "/" as Route,
          }}
        />
      </AuthPageFrame>
    )
  }

  return <AcceptInvitationClient invitationId={invitationId.trim()} />
}
