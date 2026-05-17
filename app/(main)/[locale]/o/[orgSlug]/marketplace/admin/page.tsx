import type { Metadata } from "next"

import { getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
import {
  buildCapabilityCardCopy,
  buildMarketplaceCopySource,
  CAPABILITY_CATEGORIES,
  CapabilityCard,
  CapabilityPolicyControls,
  getCapabilityDefinitions,
  isCapabilityCategory,
  organizationMarketplacePath,
  MarketplaceShell,
  type MarketplaceCategoryNavItem,
} from "#features/marketplace"
import {
  buildCapabilityViewerContext,
  listOrgCapabilityPolicy,
  listUserCapabilityPreferences,
  resolveCapabilitiesForViewer,
} from "#features/marketplace/server"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import { Link, redirect } from "#i18n/navigation"
import { requireRecentAuthStepUp } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"


export const metadata: Metadata = {
  title: "Marketplace · Admin",
  openGraph: { title: `Marketplace · Admin | ${SITE_NAME}` },
  robots: { index: false, follow: false },
}

export default async function OrganizationMarketplaceAdminPage(props: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const [{ locale: localeRaw, orgSlug }, gateResult] = await Promise.all([
    props.params,
    requireTenantAuthority([
      "tenant_owner",
      "tenant_key_admin",
      "tenant_support_admin",
    ]).catch(() => null),
  ])
  const locale = ensureAppLocale(localeRaw)

  const gate = gateResult
  if (!gate || gate.ok !== true) {
    return redirect({ href: organizationMarketplacePath(orgSlug), locale })
  }
  const session = gate.session

  await requireRecentAuthStepUp({
    returnTo: toLocalePath(
      locale,
      organizationMarketplacePath(orgSlug, "admin")
    ),
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
    {
      id: "admin",
      label: t("shell.breadcrumbs.admin"),
      href: organizationMarketplacePath(orgSlug, "admin"),
      variant: "admin",
    },
  ]

  const utilities = resolution.resolved
    .filter((entry) => entry.definition.category === "utilities")
    .sort((a, b) => a.definition.priority - b.definition.priority)
  const allAudiencePolicyByCapability = new Map(
    orgPolicy
      .filter((row) => row.audience === "all")
      .map((row) => [row.capabilityId, row.state])
  )
  const policyLabels = {
    group: t("admin.policyGroup"),
    allow: t("admin.policyAllow"),
    block: t("admin.policyBlock"),
    mandate: t("admin.policyMandate"),
    reset: t("admin.policyReset"),
    pending: t("admin.policyPending"),
    error: t("admin.policyError"),
  }

  return (
    <MarketplaceShell
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      breadcrumbs={[
        {
          label: t("shell.breadcrumbs.marketplace"),
          href: organizationMarketplacePath(orgSlug),
        },
        { label: t("shell.breadcrumbs.admin") },
      ]}
      headerActions={
        <Button asChild variant="outline" size="sm">
          <Link href={organizationMarketplacePath(orgSlug)}>
            {t("admin.backToOverview")}
          </Link>
        </Button>
      }
      nav={{
        ariaLabel: t("shell.navAriaLabel"),
        activePath: organizationMarketplacePath(orgSlug, "admin"),
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
                actionSlot={
                  <CapabilityPolicyControls
                    capabilityId={entry.definition.id}
                    policyState={
                      allAudiencePolicyByCapability.get(entry.definition.id) ??
                      null
                    }
                    labels={policyLabels}
                  />
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </MarketplaceShell>
  )
}
