import type { Metadata } from "next"
import { Suspense } from "react"

import { AppSubLayoutShellSkeleton } from "#app-shell"
import { requireRecentAuthStepUp } from "#lib/auth"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"
import { requireGlobalAdminSession, requireOrgSession } from "#lib/auth"
import { organizationOperatorPath } from "#features/platform-admin"

import { OrgOperatorDeferredShell } from "./_components/org-operator-deferred-shell"

export const metadata: Metadata = {
  title: "Operator",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Operator | ${SITE_NAME}` },
}

export default function OrganizationOperatorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  return (
    <Suspense
      fallback={
        <AppSubLayoutShellSkeleton statusLabel="Loading operator console" />
      }
    >
      <OrganizationOperatorLayoutInner params={params}>
        {children}
      </OrganizationOperatorLayoutInner>
    </Suspense>
  )
}

async function OrganizationOperatorLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const [globalAdmin, orgSession] = await Promise.all([
    requireGlobalAdminSession(),
    requireOrgSession(),
  ])
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, organizationOperatorPath(orgSlug)),
  })

  return (
    <OrgOperatorDeferredShell
      locale={locale}
      orgSlug={orgSlug}
      globalAdmin={globalAdmin}
      orgSession={orgSession}
    >
      {children}
    </OrgOperatorDeferredShell>
  )
}
