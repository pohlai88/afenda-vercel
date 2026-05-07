import type { Route } from "next"
import { redirect } from "next/navigation"

import {
  getEnabledSocialProviderIds,
  hasCredentialAccount,
  listSafeLinkedAccounts,
} from "#lib/auth"
import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { getAuthSessionTrusted } from "#lib/session-cache"

import { AccountIdentityClient } from "./identity-client"

export default async function AccountIdentityPage({
  searchParams,
  params,
}: {
  searchParams?: Promise<{ notice?: string }>
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const session = await getAuthSessionTrusted()
  if (!session?.user?.id) {
    const q = encodeURIComponent(
      resolvePostAuthCallbackUrl(toLocalePath(locale, "/account/identity"))
    )
    redirect(`${toLocalePath(locale, "/sign-in")}?callbackUrl=${q}` as Route)
  }

  const sp = searchParams ? await searchParams : {}
  const notice = typeof sp.notice === "string" ? sp.notice : undefined

  const [linkedAccounts, hasCredential, enabledProviders] = await Promise.all([
    listSafeLinkedAccounts(session.user.id),
    hasCredentialAccount(session.user.id),
    Promise.resolve(getEnabledSocialProviderIds()),
  ])

  return (
    <AccountIdentityClient
      email={session.user.email}
      name={session.user.name ?? ""}
      emailVerified={Boolean(session.user.emailVerified)}
      notice={notice}
      linkedAccounts={linkedAccounts}
      enabledProviders={enabledProviders}
      hasCredential={hasCredential}
    />
  )
}
