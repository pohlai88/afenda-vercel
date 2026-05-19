import type { Metadata, Route } from "next"
import { getTranslations } from "next-intl/server"

import { AcceptInvitationClient } from "#components2/auth/accept-invitation-client"
import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { AuthResult } from "#components2/auth/auth-result"
import { localeAwarePathToClientRoute } from "#lib/auth/auth-flow.shared"
import { getAuthShellSignedInSessionOrNull } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export async function generateMetadata({
  params,
}: Pick<
  PageProps<"/[locale]/accept-invitation">,
  "params"
>): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations({ locale, namespace: "AcceptInvitation" })

  return {
    title: t("pageMetadataTitle"),
    openGraph: { title: `${t("pageMetadataTitle")} | ${SITE_NAME}` },
  }
}

export default async function AcceptInvitationPage({
  params,
  searchParams,
}: PageProps<"/[locale]/accept-invitation">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const raw = sp.invitationId
  const invitationId = Array.isArray(raw) ? raw[0] : raw
  const t = await getTranslations({ locale, namespace: "AcceptInvitation" })

  if (!invitationId?.trim()) {
    return (
      <AuthPageFrame>
        <AuthResult
          variant="warning"
          title={t("missingId.title")}
          description={t("missingId.description")}
          primaryAction={{
            label: t("missingId.primary"),
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
          title={t("signInRequired.title")}
          description={t("signInRequired.description")}
          primaryAction={{
            label: t("signInRequired.primary"),
            href: localeAwarePathToClientRoute(signInHref) as Route,
          }}
          secondaryAction={{
            label: t("signInRequired.secondary"),
            href: "/" as Route,
          }}
        />
      </AuthPageFrame>
    )
  }

  return (
    <AuthPageFrame>
      <AcceptInvitationClient invitationId={invitationId.trim()} />
    </AuthPageFrame>
  )
}
