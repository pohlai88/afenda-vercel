import { Suspense } from "react"

import { AppSubLayoutShellSkeleton } from "#app-shell"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { getOrgTenantContext } from "#lib/auth"
import {
  generateIamProfileOverviewMetadata,
  OrgIamProfileDeferredShell,
} from "#features/iam-profile/server"

export const generateMetadata = generateIamProfileOverviewMetadata

export default function OrganizationIamProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  return (
    <Suspense
      fallback={
        <AppSubLayoutShellSkeleton statusLabel="Loading profile settings" />
      }
    >
      <OrganizationIamProfileLayoutInner params={params}>
        {children}
      </OrganizationIamProfileLayoutInner>
    </Suspense>
  )
}

async function OrganizationIamProfileLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = bindRequestLocale(localeRaw)
  const session = await getOrgTenantContext()

  return (
    <OrgIamProfileDeferredShell
      locale={locale}
      orgSlug={orgSlug}
      orgSession={session}
    >
      {children}
    </OrgIamProfileDeferredShell>
  )
}
