import type { Metadata } from "next"

import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"
import {
  buildCapabilityCardCopy,
  buildMarketplaceCopySource,
  CAPABILITY_CATEGORIES,
  CapabilityCard,
  getCapabilityDefinitions,
  isCapabilityCategory,
  marketplacePath,
  MarketplaceShell,
  type MarketplaceCategoryNavItem,
} from "#features/marketplace"
import {
  buildCapabilityViewerContext,
  listOrgCapabilityPolicy,
  listUserCapabilityPreferences,
  resolveCapabilitiesForViewer,
} from "#features/marketplace/server"
import { Link } from "#i18n/navigation"
import { canActInOrganization, requireRecentAuthStepUp } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"
import { redirect } from "#i18n/navigation"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Marketplace · Admin",
  openGraph: { title: `Marketplace · Admin | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

/**
 * Marketplace admin governance — Tier A surface.
 *
 * Auth ladder (top wins):
 *
 *   1. `requireOrgSession` (layout already enforces it; called here
 *      again for an explicit gate inside the page graph).
 *   2. `canActInOrganization(..., "admin")` — non-admins are sent
 *      back to the public marketplace. We do **not** 404 the page;
 *      members should still know the admin surface exists.
 *   3. `requireRecentAuthStepUp({ returnTo })` — admins must have
 *      authenticated recently before changing policy. Step-up is
 *      handled by the shared `/session-expired` flow.
 *
 * v1 surface: read-only catalog with the resolver state per
 * capability. Mutating Server Actions exist but the wiring of
 * inline policy controls comes in a follow-up; the doctrine here is
 * "make the gate visible and audit-trailed before iterating on the
 * policy editor UI".
 */
export default async function MarketplaceAdminPage(
  props: PageProps<"/[locale]/marketplace/admin">
) {
  const { locale: localeRaw } = await props.params
  const locale = ensureAppLocale(localeRaw)
  const session = await requireOrgSession()

  const isAdmin = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!isAdmin) {
    // Non-admin members keep their entry into the marketplace, just
    // not the governance surface. Locale-internal href.
    redirect({ href: marketplacePath(), locale })
  }

  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, marketplacePath("admin")),
  })

  const [t, viewer, orgPolicy, userPreferences] = await Promise.all([
    getTranslations("Marketplace"),
    buildCapabilityViewerContext({
      userId: session.userId,
      userRole: session.user.role,
      organizationId: session.organizationId,
    }),
    listOrgCapabilityPolicy(session.organizationId),
    listUserCapabilityPreferences({
      organizationId: session.organizationId,
      userId: session.userId,
    }),
  ])

  const definitions = getCapabilityDefinitions()
  const resolution = resolveCapabilitiesForViewer({
    viewer,
    orgPolicy,
    userPreferences,
    definitions,
  })

  const copy = buildMarketplaceCopySource(t)

  const counts = new Map<string, number>()
  for (const def of definitions) {
    counts.set(def.category, (counts.get(def.category) ?? 0) + 1)
  }
  const navItems: MarketplaceCategoryNavItem[] = [
    {
      id: "overview",
      label: t("shell.breadcrumbs.marketplace"),
      href: marketplacePath(),
      variant: "available",
    },
    ...CAPABILITY_CATEGORIES.filter(
      isCapabilityCategory
    ).map<MarketplaceCategoryNavItem>((cat) => ({
      id: cat,
      label: t(`categories.${cat}`),
      href: marketplacePath(cat),
      variant: cat === "utilities" ? "available" : "placeholder",
      ...(cat === "utilities" ? { count: counts.get(cat) ?? 0 } : {}),
    })),
    {
      id: "admin",
      label: t("shell.breadcrumbs.admin"),
      href: marketplacePath("admin"),
      variant: "admin",
    },
  ]

  // Group by category for clarity.
  const utilities = resolution.resolved
    .filter((entry) => entry.definition.category === "utilities")
    .sort((a, b) => a.definition.priority - b.definition.priority)

  return (
    <MarketplaceShell
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      breadcrumbs={[
        { label: t("shell.breadcrumbs.marketplace"), href: marketplacePath() },
        { label: t("shell.breadcrumbs.admin") },
      ]}
      headerActions={
        <Button asChild variant="outline" size="sm">
          <Link href={marketplacePath()}>{t("admin.backToOverview")}</Link>
        </Button>
      }
      nav={{
        ariaLabel: t("shell.navAriaLabel"),
        activePath: marketplacePath("admin"),
        comingSoonLabel: t("shell.comingSoonBadge"),
        items: navItems,
      }}
    >
      <section className="flex flex-col gap-3">
        <header className="flex flex-col gap-1">
          <h2 className="text-sm font-medium tracking-tight text-foreground">
            {t("admin.panelTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("admin.panelSubtitle")}
          </p>
        </header>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {utilities.map((entry) => (
            <li key={entry.definition.id}>
              <CapabilityCard
                capability={entry}
                copy={buildCapabilityCardCopy(entry, copy)}
              />
            </li>
          ))}
        </ul>
      </section>
    </MarketplaceShell>
  )
}
