import type { Metadata, Route } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { AppShell, buildAppShellOrgUtilityBarSlots } from "#app-shell"
import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"
import { localePrefixedOrgAppsRedirect } from "#lib/i18n/org-apps-redirect.server"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"
import {
  getOrganizationIdBySlug,
  getOrganizationSlugById,
} from "#lib/auth/org-slug.server"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import { requireOrgSession } from "#lib/auth"

/** Tenant ERP shell: keep org-scoped URLs out of public search indexes by default. */
export async function generateMetadata({
  params: _params,
}: Pick<LayoutProps<"/[locale]/o/[orgSlug]">, "params">): Promise<Metadata> {
  void _params
  return { robots: PRIVATE_SURFACE_ROBOTS }
}

export default function OrgSlugLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]">) {
  return (
    <Suspense fallback={null}>
      <OrgSlugLayoutInner params={params}>{children}</OrgSlugLayoutInner>
    </Suspense>
  )
}

async function OrgSlugLayoutInner({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]">) {
  const { locale: localeRaw, orgSlug: orgSlugRaw } = await params
  const locale = bindRequestLocale(localeRaw)
  const orgSlug = normalizeOrgSlugParam(orgSlugRaw)
  if (!orgSlug) {
    return <OrgSlugUnavailable />
  }

  const [resolvedOrgId, session] = await Promise.all([
    getOrganizationIdBySlug(orgSlug),
    requireOrgSession(),
  ])

  if (!resolvedOrgId) {
    return <OrgSlugUnavailable />
  }

  if (resolvedOrgId !== session.organizationId) {
    const canonicalSlug = await getOrganizationSlugById(session.organizationId)
    if (!canonicalSlug) {
      return <OrgSlugUnavailable />
    }
    const target = await localePrefixedOrgAppsRedirect(
      locale,
      canonicalSlug
    )
    redirect(target as Route)
  }

  const tShell = await getTranslations("Dashboard.shell")

  const envelope: RouteEnvelope = {
    surface: "org",
    locale,
    orgSlug,
    orgId: session.organizationId,
  }

  const utilityBar = await buildAppShellOrgUtilityBarSlots({
    locale,
    orgSlug,
    orgName: orgSlug,
    orgId: session.organizationId,
    userId: session.userId,
    userEmail: session.user.email,
  })

  return (
    <AppShell
      envelope={envelope}
      skipToMainLabel={tShell("skipToMain")}
      enableLynxSummon
      orgSlug={orgSlug}
      utilityBar={utilityBar}
      rail={null}
    >
      {children}
    </AppShell>
  )
}

function OrgSlugUnavailable() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">
          Organization not available
        </h1>
        <p className="text-sm text-muted-foreground">
          We could not open this workspace. Pick another organization or return
          home.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/console">Organization console</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  )
}
