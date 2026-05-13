import type { Metadata } from "next"

import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { Button } from "#components/ui/button"
import {
  CAPABILITY_CATEGORIES,
  getCapabilityDefinitions,
  isCapabilityCategory,
  organizationMarketplacePath,
  MarketplaceEmptyState,
  MarketplaceShell,
  type CapabilityCategory,
  type MarketplaceCategoryNavItem,
} from "#features/marketplace"
import { Link } from "#i18n/navigation"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"
import { canActInOrganization } from "#lib/auth"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Marketplace · Category",
  openGraph: { title: `Marketplace | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

export default async function OrganizationMarketplaceCategoryPage(props: {
  params: Promise<{ orgSlug: string; category: string }>
}) {
  const { category: rawCategory, orgSlug } = await props.params
  if (!isCapabilityCategory(rawCategory)) {
    notFound()
  }
  const category: CapabilityCategory = rawCategory

  const session = await requireOrgSession()
  const [t, isAdmin] = await Promise.all([
    getTranslations("Marketplace"),
    canActInOrganization(
      session.userId,
      session.user.role,
      session.organizationId,
      "admin"
    ),
  ])

  const definitions = getCapabilityDefinitions()
  const counts = new Map<string, number>()
  for (const def of definitions) {
    counts.set(def.category, (counts.get(def.category) ?? 0) + 1)
  }
  const navItems: MarketplaceCategoryNavItem[] = [
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

  return (
    <MarketplaceShell
      title={t("category.title", { category: t(`categories.${category}`) })}
      subtitle={t("category.subtitlePlaceholder", {
        category: t(`categories.${category}`),
      })}
      breadcrumbs={[
        {
          label: t("shell.breadcrumbs.marketplace"),
          href: organizationMarketplacePath(orgSlug),
        },
        { label: t(`shell.breadcrumbs.${category}`) },
      ]}
      nav={{
        ariaLabel: t("shell.navAriaLabel"),
        activePath: organizationMarketplacePath(orgSlug, category),
        comingSoonLabel: t("shell.comingSoonBadge"),
        items: navItems,
      }}
    >
      <MarketplaceEmptyState
        title={t("category.emptyTitle")}
        description={t("category.emptyDescription")}
      >
        <Button asChild variant="outline">
          <Link href={organizationMarketplacePath(orgSlug)}>
            {t("category.backToOverview")}
          </Link>
        </Button>
      </MarketplaceEmptyState>
    </MarketplaceShell>
  )
}
