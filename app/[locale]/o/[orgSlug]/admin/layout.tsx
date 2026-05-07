import type { ReactNode } from "react"
import type { Metadata } from "next"
import type { Route } from "next"

import { notFound, redirect } from "next/navigation"

import {
  OrgAdminWorkbenchShell,
  organizationAdminPath,
} from "#features/org-admin"

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

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  openGraph: { title: `Organization admin | ${SITE_NAME}` },
}

export default async function OrgAdminWorkbenchLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const resume = toLocalePath(
    locale,
    organizationAdminPath(orgSlug, "overview")
  ) as unknown as string

  await requireRecentAuthStepUp({ returnTo: resume })
  await requireVerifiedEmailForAccount(resume)

  const orgSession = await requireOrgSession()
  const canAdmin = await canActInOrganization(
    orgSession.userId,
    orgSession.user.role,
    orgSession.organizationId,
    "admin"
  )
  if (!canAdmin) {
    redirect(
      toLocalePath(locale, organizationDashboardPath(orgSlug, "home")) as Route
    )
  }

  const identity = await fetchOrgWorkbenchIdentity(orgSession.organizationId)
  if (!identity) {
    notFound()
  }

  return (
    <OrgAdminWorkbenchShell orgSlug={orgSlug} orgName={identity.name}>
      {children}
    </OrgAdminWorkbenchShell>
  )
}
