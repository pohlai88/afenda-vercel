import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import {
  getEnabledSocialProviderIds,
  requireAuthShellSignedInSession,
} from "#lib/auth"
import {
  hasCredentialAccount,
  listSafeLinkedAccounts,
} from "#features/iam-profile/server"
import { generateIamProfileIdentityMetadata } from "#features/iam-profile/server"
import { AppShellSurface } from "#app-shell"
import { organizationNexusPath } from "#features/nexus"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"
import { IamProfileIdentityClient } from "#components2/iam-profile/iam-profile-identity.client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  return generateIamProfileIdentityMetadata(params)
}

export default async function OrganizationIamProfileIdentityPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>
  searchParams?: Promise<{ notice?: string }>
}) {
  const { orgSlug } = await params
  const sp = (await searchParams) ?? {}
  const notice = typeof sp.notice === "string" ? sp.notice : undefined

  const session = await requireAuthShellSignedInSession()
  const [tSurface, t, linkedAccounts, hasCredential, enabledProviders] =
    await Promise.all([
      getTranslations("IamProfileSurface"),
      getTranslations("IamProfileSurface.identity"),
      listSafeLinkedAccounts(session.userId),
      hasCredentialAccount(session.userId),
      Promise.resolve(getEnabledSocialProviderIds()),
    ])

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
