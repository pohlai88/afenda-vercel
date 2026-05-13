import type { Metadata } from "next"

import { getTranslations } from "next-intl/server"

import {
  buildCapabilityCardCopy,
  buildCapabilityTableRowCopy,
  buildMarketplaceCopySource,
  CAPABILITY_CATEGORIES,
  CapabilityCard,
  CapabilityTable,
  getCapabilitiesForCategory,
  getCapabilityDefinitions,
  isCapabilityCategory,
  isMarketplaceViewMode,
  MARKETPLACE_VIEW_PARAM,
  organizationMarketplacePath,
  MarketplaceShell,
  MarketplaceViewSwitcher,
  type MarketplaceCategoryNavItem,
  type MarketplaceViewMode,
} from "#features/marketplace"
import {
  buildCapabilityViewerContext,
  listOrgCapabilityPolicy,
  listUserCapabilityPreferences,
  resolveCapabilitiesForViewer,
} from "#features/marketplace/server"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Marketplace · Utilities",
  openGraph: { title: `Marketplace · Utilities | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

export default async function OrganizationMarketplaceUtilitiesPage(props: {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ orgSlug }, session, search] = await Promise.all([
    props.params,
    requireOrgSession(),
    props.searchParams,
  ])
  const viewParam = first(search?.[MARKETPLACE_VIEW_PARAM])
  const view: MarketplaceViewMode = isMarketplaceViewMode(viewParam)
    ? viewParam
    : "card"

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

  const definitions = getCapabilitiesForCategory("utilities")
  const resolution = resolveCapabilitiesForViewer({
    viewer,
    orgPolicy,
    userPreferences,
    definitions,
  })

  const copy = buildMarketplaceCopySource(t)
  const allDefinitions = getCapabilityDefinitions()
  const navItems = buildNavItems({
    t,
    isAdmin: viewer.isAdmin,
    counts: countByCategory(allDefinitions),
    orgSlug,
  })

  const visible = resolution.resolved
    .filter((entry) => entry.effective !== "unavailable")
    .sort((a, b) => a.definition.priority - b.definition.priority)
  const unavailable = resolution.resolved
    .filter((entry) => entry.effective === "unavailable")
    .sort((a, b) => a.definition.priority - b.definition.priority)

  const headerActions = (
    <MarketplaceViewSwitcher
      basePath={organizationMarketplacePath(orgSlug, "utilities")}
      ariaLabel={t("shell.viewSwitcherAriaLabel")}
      cardLabel={t("shell.viewSwitcherCard")}
      tableLabel={t("shell.viewSwitcherTable")}
      active={view}
    />
  )

  return (
    <MarketplaceShell
      title={t("category.title", { category: t("categories.utilities") })}
      subtitle={t("category.subtitleUtilities")}
      breadcrumbs={[
        {
          label: t("shell.breadcrumbs.marketplace"),
          href: organizationMarketplacePath(orgSlug),
        },
        { label: t("shell.breadcrumbs.utilities") },
      ]}
      headerActions={headerActions}
      nav={{
        ariaLabel: t("shell.navAriaLabel"),
        activePath: organizationMarketplacePath(orgSlug, "utilities"),
        comingSoonLabel: t("shell.comingSoonBadge"),
        items: navItems,
      }}
    >
      {view === "table" ? (
        <CapabilityTable
          caption={t("category.tableCaption", {
            category: t("categories.utilities"),
          })}
          headers={{
            capability: t("category.tableHeaderCapability"),
            state: t("category.tableHeaderState"),
            source: t("category.tableHeaderSource"),
            actions: t("category.tableHeaderActions"),
          }}
          rows={resolution.resolved
            .slice()
            .sort((a, b) => a.definition.priority - b.definition.priority)
            .map((capability) => ({
              capability,
              copy: buildCapabilityTableRowCopy(capability, copy),
            }))}
          toggleLabels={copy.toggle}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((entry) => (
              <li key={entry.definition.id}>
                <CapabilityCard
                  capability={entry}
                  copy={buildCapabilityCardCopy(entry, copy)}
                />
              </li>
            ))}
          </ul>

          {unavailable.length > 0 ? (
            <section className="flex flex-col gap-3">
              <header className="flex flex-col gap-1">
                <h2 className="text-sm font-medium tracking-tight text-foreground">
                  {t("shell.metaStateBadge.unavailable")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("shell.stateHint.unavailable")}
                </p>
              </header>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unavailable.map((entry) => (
                  <li key={entry.definition.id}>
                    <CapabilityCard
                      capability={entry}
                      copy={buildCapabilityCardCopy(entry, copy)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </MarketplaceShell>
  )
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function countByCategory(
  definitions: ReturnType<typeof getCapabilityDefinitions>
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const def of definitions) {
    counts.set(def.category, (counts.get(def.category) ?? 0) + 1)
  }
  return counts
}

function buildNavItems(input: {
  t: Awaited<ReturnType<typeof getTranslations<"Marketplace">>>
  isAdmin: boolean
  counts: Map<string, number>
  orgSlug: string
}): MarketplaceCategoryNavItem[] {
  const { t, isAdmin, counts, orgSlug } = input
  return [
    {
      id: "overview",
      label: t("shell.breadcrumbs.marketplace"),
      href: organizationMarketplacePath(orgSlug),
      variant: "available",
    },
    ...CAPABILITY_CATEGORIES.filter(
      isCapabilityCategory
    ).map<MarketplaceCategoryNavItem>((cat) => ({
      id: cat,
      label: t(`categories.${cat}`),
      href: organizationMarketplacePath(orgSlug, cat),
      variant: cat === "utilities" ? "available" : "placeholder",
      ...(cat === "utilities" ? { count: counts.get(cat) ?? 0 } : {}),
    })),
    ...(isAdmin
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
}
