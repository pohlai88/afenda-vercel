import type { Metadata } from "next"

import { getTranslations } from "next-intl/server"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { WorkbenchShell, WorkbenchUtilityBar } from "#components/workbench"
import { fetchOrgWorkbenchIdentity } from "#lib/auth"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Marketplace",
  openGraph: { title: `Marketplace | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

/**
 * Locale-internal `/{locale}/marketplace` layout — top-level
 * Capability Registry surface.
 *
 * Marketplace is a peer of `/account` and `/console` (sits **outside**
 * `/o/{orgSlug}/…`) but capability resolution is per-organization, so
 * the layout requires an **active org session**. Without one the user
 * is sent through `redirectToAuthInterruption(ORG_REQUIRED)` which
 * lands them in `/console` to pick a workspace; they then return to
 * the same marketplace URL.
 *
 * The shell is the canonical post-login `WorkbenchShell` (no second
 * shell). No left rail in v1 — category navigation lives **inside**
 * the surface (`MarketplaceCategoryNav`) rather than as a rail of
 * single-icon items, which would force the seven categories into
 * unfamiliar nav-icon glyphs and dilute the calm overview lockup.
 */
export default async function MarketplaceLayout({
  children,
  params,
}: LayoutProps<"/[locale]/marketplace">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  // Tier A — blocking authority. Active-org check happens here once;
  // every page composes the resolver with the same `requireOrgSession`
  // result via React.cache.
  const session = await requireOrgSession()
  const [identity, t] = await Promise.all([
    fetchOrgWorkbenchIdentity(session.organizationId),
    getTranslations("Marketplace"),
  ])

  const envelope: RouteEnvelope = {
    surface: "marketplace",
    locale,
    orgId: session.organizationId,
    ...(identity ? { orgSlug: identity.slug } : {}),
  }

  return (
    <RouteEnvelopeProvider value={envelope}>
      <WorkbenchShell
        skipToMainLabel={t("shell.skipToMain")}
        utilityBar={
          identity ? (
            <WorkbenchUtilityBar
              mode="org"
              orgSlug={identity.slug}
              orgName={identity.name}
              orgId={session.organizationId}
              userId={session.userId}
              userEmail={session.user.email}
            />
          ) : (
            <WorkbenchUtilityBar
              mode="no-org"
              userId={session.userId}
              userEmail={session.user.email}
            />
          )
        }
        rail={null}
      >
        {children}
      </WorkbenchShell>
    </RouteEnvelopeProvider>
  )
}
