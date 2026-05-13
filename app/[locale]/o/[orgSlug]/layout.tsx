import type { Metadata, Route } from "next"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { AppShell } from "#components/workbench"
import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { localePrefixedOrgDashboardRedirect } from "#lib/dashboard-org-redirect.server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"
import {
  getOrganizationIdBySlug,
  getOrganizationSlugById,
} from "#lib/org-slug.server"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { requireOrgSession } from "#lib/tenant"

/** Tenant ERP shell: keep org-scoped URLs out of public search indexes by default. */
export async function generateMetadata({
  params: _params,
}: Pick<LayoutProps<"/[locale]/o/[orgSlug]">, "params">): Promise<Metadata> {
  void _params
  return { robots: PRIVATE_SURFACE_ROBOTS }
}

export default async function OrgSlugLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]">) {
  const { locale: localeRaw, orgSlug: orgSlugRaw } = await params
  const locale = ensureAppLocale(localeRaw)
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
    // Cross-tenant correction — the URL org slug doesn't match the session's active org.
    const canonicalSlug = await getOrganizationSlugById(session.organizationId)
    if (!canonicalSlug) {
      return <OrgSlugUnavailable />
    }
    const target = await localePrefixedOrgDashboardRedirect(
      locale,
      canonicalSlug
    )
    redirect(target as Route)
  }

  // `orgName` for the utility bar is provisional (`orgSlug`); the async
  // `WorkbenchUtilityBarRow` (already under Suspense) resolves the display
  // name from `listUserOrganizationsForSwitcher` without blocking this layout.
  const tShell = await getTranslations("Dashboard.shell")

  const envelope: RouteEnvelope = {
    surface: "org",
    locale,
    orgSlug,
    orgId: session.organizationId,
  }

  // AppShell mounts here so L1 utility bar, command palette, and Lynx
  // summon persist across surfaces — Spatial OS continuity.
  // No rail at this level: Nexus Field (org root) renders rail-less.
  // Rail is added by sub-layouts (org-admin, HRM, etc.) when needed.
  // Nexus field content lives under `nexus/page.tsx` (`/o/{slug}/nexus`).
  // See AGENTS.md §5 → Nexus runtime (org root).
  return (
    <AppShell
      envelope={envelope}
      skipToMainLabel={tShell("skipToMain")}
      utilityBar={{
        mode: "org",
        orgSlug,
        orgName: orgSlug,
        orgId: session.organizationId,
        userId: session.userId,
        userEmail: session.user.email,
      }}
      rail={null}
      enableLynxSummon
      orgSlug={orgSlug}
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
