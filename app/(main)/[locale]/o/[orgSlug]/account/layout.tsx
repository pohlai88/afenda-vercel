import type { Metadata } from "next"
import { Suspense } from "react"

import { AppSubLayoutShellSkeleton } from "#app-shell"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"

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
  const locale = ensureAppLocale(localeRaw)
  const session = await requireOrgSession()

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
