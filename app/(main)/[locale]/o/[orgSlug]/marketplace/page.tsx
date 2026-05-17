import type { Metadata } from "next"

import { getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
import {
  buildCapabilityCardCopy,
  buildMarketplaceCopySource,
  CAPABILITY_CATEGORIES,
  CapabilityCard,
  getCapabilityDefinitions,
  getCapabilityDisplayName,
  organizationMarketplacePath,
  MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD,
  MarketplaceMetricsStrip,
  MarketplaceShell,
  type MarketplaceCategoryNavItem,
  type MarketplaceMetricStrip,
} from "#features/marketplace"
import {
  buildCapabilityViewerContext,
  getCapabilityChainMetrics,
  listOrgCapabilityPolicy,
  listUserCapabilityPreferences,
  resolveCapabilitiesForViewer,
} from "#features/marketplace/server"
import { Link } from "#i18n/navigation"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/auth"


export const metadata: Metadata = {
  title: "Marketplace",
  openGraph: { title: `Marketplace | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

const FEATURED_LIMIT = 9

export default async function OrganizationMarketplaceOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await requireOrgSession()
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
  const categoryCounts = new Map<string, number>()
  for (const def of definitions) {
    categoryCounts.set(
      def.category,
      (categoryCounts.get(def.category) ?? 0) + 1
    )
  }

  const navItems: MarketplaceCategoryNavItem[] = [
    {
      id: "overview",
      label: t("shell.breadcrumbs.marketplace"),
      href: organizationMarketplacePath(orgSlug),
      variant: "available",
    },
    ...CAPABILITY_CATEGORIES.map<MarketplaceCategoryNavItem>((cat) => ({
      id: cat,
      label: t(`categories.${cat}`),
      href: organizationMarketplacePath(orgSlug, cat),
      variant: cat === "utilities" ? "available" : "placeholder",
      ...(cat === "utilities" ? { count: categoryCounts.get(cat) ?? 0 } : {}),
    })),
    ...(viewer.isAdmin
      ? [
          {
            id: "admin" as const,
            label: t("shell.breadcrumbs.admin"),
            href: organizationMarketplacePath(orgSlug, "admin"),
            variant: "admin" as const,
          },
        ]
      : []),
  ]

  const featuredIds = new Set(resolution.visibleIds)
  const featured = resolution.resolved.filter((entry) =>
    featuredIds.has(entry.definition.id)
  )
  const more = resolution.resolved
    .filter(
      (entry) =>
        entry.definition.category === "utilities" &&
        !featuredIds.has(entry.definition.id) &&
        entry.effective !== "unavailable"
    )
    .sort((a, b) => a.definition.priority - b.definition.priority)

  const featuredForMetrics = featured.slice(0, FEATURED_LIMIT)
  const metricsRows = await Promise.all(
    featuredForMetrics.map((entry) =>
      getCapabilityChainMetrics(entry.definition.id)
    )
  )
  const metrics: MarketplaceMetricStrip[] = featuredForMetrics.map(
    (entry, idx) => {
      const m = metricsRows[idx]!
      const primary = m.adoptingUsers
        ? t("overview.metricsAdoptingUsers", { count: m.adoptingUsers })
        : null
      const secondary = m.adoptingOrgs
        ? t("overview.metricsAdoptingOrgs", { count: m.adoptingOrgs })
        : null
      return {
        capabilityId: entry.definition.id,
        displayName: getCapabilityDisplayName(entry.definition, copy),
        primaryLabel: primary,
        secondaryLabel: secondary,
      }
    }
  )

  return (
    <MarketplaceShell
      title={t("overview.title")}
      subtitle={t("overview.subtitle")}
      breadcrumbs={[{ label: t("shell.breadcrumbs.marketplace") }]}
      nav={{
        ariaLabel: t("shell.navAriaLabel"),
        activePath: organizationMarketplacePath(orgSlug),
        comingSoonLabel: t("shell.comingSoonBadge"),
        items: navItems,
      }}
    >
      <section className="flex flex-col gap-3">
        <header className="flex flex-col gap-1">
          <h2 className="text-sm font-medium tracking-tight text-foreground">
            {t("overview.sectionFeaturedTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("overview.sectionFeaturedSubtitle")}
          </p>
        </header>
        {featured.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("category.emptyDescription")}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((entry) => (
              <li key={entry.definition.id}>
                <CapabilityCard
                  capability={entry}
                  copy={buildCapabilityCardCopy(entry, copy)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {metrics.length >= MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD ? (
        <MarketplaceMetricsStrip
          title={t("overview.metricsTitle")}
          emptyMessage={t("overview.metricsEmpty")}
          items={metrics}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <header className="flex flex-col gap-1">
          <h2 className="text-sm font-medium tracking-tight text-foreground">
            {t("overview.sectionMoreTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("overview.sectionMoreSubtitle", {
              threshold: MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD,
            })}
          </p>
        </header>
        {more.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("overview.metricsEmpty")}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((entry) => (
              <li key={entry.definition.id}>
                <CapabilityCard
                  capability={entry}
                  copy={buildCapabilityCardCopy(entry, copy)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <header className="flex flex-col gap-1">
          <h2 className="text-sm font-medium tracking-tight text-foreground">
            {t("overview.sectionCategoriesTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("overview.sectionCategoriesSubtitle")}
          </p>
        </header>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITY_CATEGORIES.filter((cat) => cat !== "utilities").map(
            (cat) => (
              <li
                key={cat}
                className="rounded-md border border-border/60 bg-background/60 p-4"
              >
                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {t(`categories.${cat}`)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t(`categoryDescriptions.${cat}` as never)}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={organizationMarketplacePath(orgSlug, cat)}>
                      {t("overview.exploreCategoryAction", {
                        category: t(`categories.${cat}`),
                      })}
                    </Link>
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      </section>

      {viewer.isAdmin ? (
        <section className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={organizationMarketplacePath(orgSlug, "admin")}>
              {t("overview.openAdminAction")}
            </Link>
          </Button>
        </section>
      ) : null}
    </MarketplaceShell>
  )
}
