import { Suspense } from "react"

import { AppSubLayoutShellSkeleton } from "#app-shell"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"

import { OrgHrmDeferredShell } from "./_components/org-hrm-deferred-shell"


export default function OrgDashboardHrmLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/dashboard/hrm">) {
  return (
    <Suspense
      fallback={
        <AppSubLayoutShellSkeleton statusLabel="Loading human resources" />
      }
    >
      <OrgDashboardHrmLayoutInner params={params}>{children}</OrgDashboardHrmLayoutInner>
    </Suspense>
  )
}

async function OrgDashboardHrmLayoutInner({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/dashboard/hrm">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)

  const orgSession = await requireOrgSession()

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
