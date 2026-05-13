import type { Metadata } from "next"
import { Suspense } from "react"

import { WorkbenchSubLayoutShellSkeleton } from "#components/workbench"
import { requireRecentAuthStepUp } from "#lib/auth"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"
import { requireGlobalAdminSession, requireOrgSession } from "#lib/tenant"
import { organizationOperatorPath } from "#features/platform-admin"

import { OrgOperatorDeferredWorkbench } from "./_components/org-operator-deferred-workbench"

export const metadata: Metadata = {
  title: "Operator",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Operator | ${SITE_NAME}` },
}

export default async function OrganizationOperatorLayout({
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
    <Suspense
      fallback={
        <WorkbenchSubLayoutShellSkeleton statusLabel="Loading operator console" />
      }
    >
      <OrgOperatorDeferredWorkbench
        locale={locale}
        orgSlug={orgSlug}
        globalAdmin={globalAdmin}
        orgSession={orgSession}
      >
        {children}
      </OrgOperatorDeferredWorkbench>
    </Suspense>
  )
}
