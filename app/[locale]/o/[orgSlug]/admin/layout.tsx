import type { Metadata } from "next"

import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import {
  WorkbenchCommandLayer,
  WorkbenchSubLayout,
} from "#components/workbench"
import {
  canActInOrganization,
  fetchOrgWorkbenchIdentity,
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
} from "#lib/auth"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"
import {
  buildOrgAdminRailSlots,
  deriveOrgAdminInbox,
  organizationAdminPath,
} from "#features/org-admin"
import type { OrgAdminInboxHrefMap } from "#features/org-admin"
import { getOrgAdminRailPressureCounts } from "#features/org-admin/server"
import {
  listPinnedForUser,
  listRecentsForUser,
  listSavedViewsForUser,
  pinDtoToSlot,
  recentDtoToSlot,
  viewDtoToSlot,
} from "#features/rail-memory/server"

export const metadata: Metadata = {
  title: "Admin",
  openGraph: { title: `Organization admin | ${SITE_NAME}` },
}

export default async function OrgAdminWorkbenchLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/admin">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const resumeTo = toLocalePath(
    locale,
    organizationAdminPath(orgSlug, "overview")
  ) as unknown as string

  await requireRecentAuthStepUp({ returnTo: resumeTo })
  await requireVerifiedEmailForAccount(resumeTo)

  const orgSession = await requireOrgSession()

  // Tier A authority + memory queries fan out in parallel. Each
  // memory query is `React.cache`-wrapped on the same
  // `(organizationId, userId, workbenchId)` tuple, so a future page
  // that re-reads the same slot inside the request shares this DB
  // round trip. `listRecentsForUser` already dedupes + caps to
  // `RAIL_RECENT_SURFACE_LIMIT` (5).
  //
  // Failures inside a memory read already degrade gracefully — the
  // queries return `[]` on any DB hiccup. Pressure + identity have
  // their own `try/catch` boundaries inside their query layer, so the
  // entire `Promise.all` cannot throw a memory-related rejection
  // strong enough to crash the layout.
  const [
    canAdmin,
    identity,
    railPressure,
    pinnedDtos,
    viewDtos,
    recentDtos,
    t,
  ] = await Promise.all([
    canActInOrganization(
      orgSession.userId,
      orgSession.user.role,
      orgSession.organizationId,
      "admin"
    ),
    fetchOrgWorkbenchIdentity(orgSession.organizationId),
    // Phase 2: rail pressure aggregates three tiny `count + min` queries
    // in parallel with Tier A authority. Layout-cached client-side; member
    // / import / endpoint Server Actions revalidate at `"layout"` scope so
    // the rail badge refreshes after every mutation that changes pressure.
    getOrgAdminRailPressureCounts(orgSession.organizationId),
    // Phase 3d (Working Memory Rail) — operator-authored memory.
    // Each query scopes by `(organizationId, userId, workbenchId)` from
    // the validated session; FormData / JSON `organizationId` is never
    // trusted (IDOR contract from `lib/features/rail-memory`).
    listPinnedForUser({
      organizationId: orgSession.organizationId,
      userId: orgSession.userId,
      workbenchId: "org-admin",
    }),
    listSavedViewsForUser({
      organizationId: orgSession.organizationId,
      userId: orgSession.userId,
      workbenchId: "org-admin",
    }),
    listRecentsForUser({
      organizationId: orgSession.organizationId,
      userId: orgSession.userId,
      workbenchId: "org-admin",
    }),
    getTranslations("OrgAdmin"),
  ])

  if (!canAdmin) {
    redirect(toLocalePath(locale, organizationDashboardPath(orgSlug, "home")))
  }
  if (!identity) {
    notFound()
  }

  // Phase 3d inbox derivation — the *single* highest-pressure concern.
  // Pure function; consumes the same `railPressure` map the nav badges
  // already use, plus a label resolver scoped to `OrgAdmin.rail.inboxLabels`.
  // Returns `null` when no concern is at surfaceable pressure right now —
  // a calm rail renders no inbox row.
  const inboxHrefByKey: OrgAdminInboxHrefMap = {
    members: organizationAdminPath(orgSlug, "members"),
    integrations: organizationAdminPath(orgSlug, "integrations"),
    audit: organizationAdminPath(orgSlug, "audit"),
    feedback: organizationAdminPath(orgSlug, "feedback"),
    settings: organizationAdminPath(orgSlug, "settings"),
  }

  const inbox = deriveOrgAdminInbox({
    pressure: railPressure,
    hrefByKey: inboxHrefByKey,
    resolveLabel: (key, count) =>
      // `t` here is scoped to `OrgAdmin`; nested `rail.inboxLabels.<key>`
      // uses ICU plural syntax to honor 1 vs. n in every locale catalog.
      // Falls through to the `members` template when an unmapped key
      // ever appears (defensive — the deriver only emits known keys).
      t(`rail.inboxLabels.${key}` as Parameters<typeof t>[0], { count }),
  })

  // RSC → kernel slot mapping is the only place serializable client
  // payloads cross the boundary. The kernel parser
  // (`workbenchRailSlotsDataSchema`) re-validates inside `WorkbenchRail`,
  // so even if a stale DB row produced an unexpected `icon` string,
  // the rail degrades to "no icon" rather than crashing the layout.
  const railSlots = buildOrgAdminRailSlots({
    orgSlug,
    orgName: identity.name,
    pressure: railPressure,
    inbox,
    pinned: pinnedDtos.map(pinDtoToSlot),
    views: viewDtos.map(viewDtoToSlot),
    recents: recentDtos.map(recentDtoToSlot),
  })

  const envelope: RouteEnvelope = {
    surface: "admin",
    locale,
    orgSlug,
    orgId: orgSession.organizationId,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>
      <WorkbenchSubLayout
        rail={{
          slots: railSlots,
          labels: {
            ariaLabel: t("nav.aria"),
            collapseLabel: t("rail.collapseLabel"),
            expandLabel: t("rail.expandLabel"),
            inboxAriaLabel: t("rail.inboxAriaLabel"),
            pinnedHeading: t("rail.pinnedHeading"),
            viewsHeading: t("rail.viewsHeading"),
            recentsHeading: t("rail.recentsHeading"),
          },
          storageKey: "afenda.orgAdmin.rail",
        }}
        commandLayer={
          <WorkbenchCommandLayer
            title={t("shell.kicker")}
            description={t("nav.aria")}
            sections={[
              {
                heading: t("nav.aria"),
                items: [
                  {
                    label: t("nav.overview"),
                    href: organizationAdminPath(orgSlug, "overview"),
                  },
                  {
                    label: t("nav.members"),
                    href: organizationAdminPath(orgSlug, "members"),
                  },
                  {
                    label: t("nav.audit"),
                    href: organizationAdminPath(orgSlug, "audit"),
                  },
                  {
                    label: t("nav.integrations"),
                    href: organizationAdminPath(orgSlug, "integrations"),
                  },
                  {
                    label: t("nav.settings"),
                    href: organizationAdminPath(orgSlug, "settings"),
                  },
                ],
              },
            ]}
          />
        }
      >
        {children}
      </WorkbenchSubLayout>
    </RouteEnvelopeProvider>
  )
}
