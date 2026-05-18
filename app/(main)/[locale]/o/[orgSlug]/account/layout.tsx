import type { Metadata } from "next"
import { Suspense } from "react"

import { AppSubLayoutShellSkeleton } from "#app-shell"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { getOrgTenantContext } from "#lib/auth"

import { generateAccountOverviewMetadata } from "../../../(iam)/account/account-metadata"
import { OrgAccountDeferredShell } from "./_components/org-account-deferred-shell"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return generateAccountOverviewMetadata(Promise.resolve({ locale }))
}


export default function OrganizationAccountLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  return (
    <Suspense
      fallback={
        <AppSubLayoutShellSkeleton statusLabel="Loading account settings" />
      }
    >
      <OrganizationAccountLayoutInner params={params}>
        {children}
      </OrganizationAccountLayoutInner>
    </Suspense>
  )
}

async function OrganizationAccountLayoutInner({
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
    <OrgAccountDeferredShell
      locale={locale}
      orgSlug={orgSlug}
      orgSession={session}
    >
      {children}
    </OrgAccountDeferredShell>
  )
}
