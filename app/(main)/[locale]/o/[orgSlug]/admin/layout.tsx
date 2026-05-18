import type { Metadata } from "next"
import { Suspense } from "react"

import { notFound, redirect } from "next/navigation"

import { AppSubLayoutShellSkeleton } from "#app-shell"
import {
  fetchOrgAdminIdentity,
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
} from "#lib/auth"
import { organizationAppsPath } from "#lib/org-apps-module-paths"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/auth"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import { organizationAdminPath } from "#features/org-admin"

import { OrgAdminDeferredShell } from "./_components/org-admin-deferred-shell"

export const metadata: Metadata = {
  title: "Admin",
  openGraph: { title: `Organization admin | ${SITE_NAME}` },
}

export default function OrgAdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/admin">) {
  return (
    <Suspense
      fallback={
        <AppSubLayoutShellSkeleton statusLabel="Loading organization admin" />
      }
    >
      <OrgAdminLayoutInner params={params}>{children}</OrgAdminLayoutInner>
    </Suspense>
  )
}

async function OrgAdminLayoutInner({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/admin">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = bindRequestLocale(localeRaw)
  const resumeTo = toLocalePath(
    locale,
    organizationAdminPath(orgSlug, "overview")
  ) as unknown as string

  await requireRecentAuthStepUp({ returnTo: resumeTo })
  await requireVerifiedEmailForAccount(resumeTo)

  const orgSession = await requireOrgSession()

  const [tenantAuthorityGate, identity] = await Promise.all([
    requireTenantAuthority([
      "tenant_owner",
      "tenant_key_admin",
      "tenant_support_admin",
    ]),
    fetchOrgAdminIdentity(orgSession.organizationId),
  ])

  if (!tenantAuthorityGate.ok) {
    redirect(toLocalePath(locale, organizationAppsPath(orgSlug, "home")))
  }
  if (!identity) {
    notFound()
  }

  return (
    <OrgAdminDeferredShell
      locale={locale}
      orgSlug={orgSlug}
      orgSession={orgSession}
      identity={identity}
    >
      {children}
    </OrgAdminDeferredShell>
  )
}
