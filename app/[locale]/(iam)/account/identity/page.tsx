import {
  getEnabledSocialProviderIds,
  hasCredentialAccount,
  listSafeLinkedAccounts,
  requireAuthShellSignedInSession,
} from "#lib/auth"

import { AccountIdentityClient } from "./identity-client"

export default async function AccountIdentityPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string }>
}) {
  const session = await requireAuthShellSignedInSession()

  const sp = searchParams ? await searchParams : {}
  const notice = typeof sp.notice === "string" ? sp.notice : undefined

  const [linkedAccounts, hasCredential, enabledProviders] = await Promise.all([
    listSafeLinkedAccounts(session.userId),
    hasCredentialAccount(session.userId),
    Promise.resolve(getEnabledSocialProviderIds()),
  ])

  return (
    <AccountIdentityClient
      email={session.user.email}
      name={session.user.name ?? ""}
      emailVerified={session.user.emailVerified}
      notice={notice}
      linkedAccounts={linkedAccounts}
      enabledProviders={enabledProviders}
      hasCredential={hasCredential}
    />
  )
}
