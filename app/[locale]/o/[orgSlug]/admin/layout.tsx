import type { Metadata } from "next"
import { Suspense } from "react"

import { notFound, redirect } from "next/navigation"

import { WorkbenchSubLayoutShellSkeleton } from "#components/workbench"
import {
  canActInOrganization,
  fetchOrgWorkbenchIdentity,
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
} from "#lib/auth"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"
import { organizationAdminPath } from "#features/org-admin"

import { OrgAdminDeferredWorkbench } from "./_components/org-admin-deferred-workbench"

export const metadata: Metadata = {
  title: "Admin",
  openGraph: { title: `Organization admin | ${SITE_NAME}` },
}

export default async function OrgAdminWorkbenchLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/admin">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const resumeTo = toLocalePath(
    locale,
    organizationAdminPath(orgSlug, "overview")
  ) as unknown as string

  await requireRecentAuthStepUp({ returnTo: resumeTo })
  await requireVerifiedEmailForAccount(resumeTo)

  const orgSession = await requireOrgSession()

  const [canAdmin, identity] = await Promise.all([
    canActInOrganization(
      orgSession.userId,
      orgSession.user.role,
      orgSession.organizationId,
      "admin"
    ),
    fetchOrgWorkbenchIdentity(orgSession.organizationId),
  ])

  if (!canAdmin) {
    redirect(toLocalePath(locale, organizationDashboardPath(orgSlug, "home")))
  }
  if (!identity) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <WorkbenchSubLayoutShellSkeleton statusLabel="Loading organization admin" />
      }
    >
      <OrgAdminDeferredWorkbench
        locale={locale}
        orgSlug={orgSlug}
        orgSession={orgSession}
        identity={identity}
      >
        {children}
      </OrgAdminDeferredWorkbench>
    </Suspense>
  )
}
