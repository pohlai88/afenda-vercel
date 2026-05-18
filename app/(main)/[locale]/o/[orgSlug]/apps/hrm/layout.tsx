import { Suspense } from "react"

import { AppSubLayoutShellSkeleton } from "#app-shell"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { getOrgTenantContext } from "#lib/auth"

import { OrgHrmDeferredShell } from "#features/hrm"


export default function OrgAppsHrmLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/apps/hrm">) {
  return (
    <Suspense
      fallback={
        <AppSubLayoutShellSkeleton statusLabel="Loading human resources" />
      }
    >
      <OrgAppsHrmLayoutInner params={params}>{children}</OrgAppsHrmLayoutInner>
    </Suspense>
  )
}

async function OrgAppsHrmLayoutInner({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/apps/hrm">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = bindRequestLocale(localeRaw)

  const orgSession = await getOrgTenantContext()

  return (
    <OrgHrmDeferredShell
      locale={locale}
      orgSlug={orgSlug}
      orgSession={orgSession}
    >
      {children}
    </OrgHrmDeferredShell>
  )
}
