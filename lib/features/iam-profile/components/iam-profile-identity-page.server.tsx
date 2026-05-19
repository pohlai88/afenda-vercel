import "server-only"

import { getTranslations } from "next-intl/server"

import { AppShellSurface } from "#app-shell"
import { IamProfileIdentityClient } from "#components2/iam-profile/iam-profile-identity.client"
import {
  getEnabledSocialProviderIds,
  requireAuthShellSignedInSession,
} from "#lib/auth"
import { organizationNexusPath } from "#features/nexus"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"

import { hasCredentialAccount, listSafeLinkedAccounts } from "../data/account-identity.server"

export default async function IamProfileIdentityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
  searchParams?: Promise<{ notice?: string }>
}) {
  const { orgSlug } = await params
  const sp = (await searchParams) ?? {}
  const notice = typeof sp.notice === "string" ? sp.notice : undefined

  const session = await requireAuthShellSignedInSession()
  const [tSurface, t, linkedAccounts, hasCredential] = await Promise.all([
    getTranslations("IamProfileSurface"),
    getTranslations("IamProfileSurface.identity"),
    listSafeLinkedAccounts(session.userId),
    hasCredentialAccount(session.userId),
  ])
  const enabledProviders = getEnabledSocialProviderIds()

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
      <IamProfileIdentityClient
        email={session.user.email}
        name={session.user.name ?? ""}
        emailVerified={session.user.emailVerified}
        notice={notice}
        linkedAccounts={linkedAccounts}
        enabledProviders={enabledProviders}
        hasCredential={hasCredential}
        identityPath={organizationIamProfilePath(orgSlug, "identity")}
        securityPath={organizationIamProfilePath(orgSlug, "security")}
        nexusPath={organizationNexusPath(orgSlug)}
      />
    </AppShellSurface>
  )
}
