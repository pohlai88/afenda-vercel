import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#components/workbench"
import { WorkbenchRailFooter } from "#components/workbench/left-nav-rail"
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
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import type { OrgSession } from "#lib/tenant"

/** Row from `fetchOrgWorkbenchIdentity` after Tier A `notFound()` guard. */
export type OrgWorkbenchIdentityRow = { name: string | null; slug: string }

export type OrgAdminDeferredWorkbenchProps = {
  children: ReactNode
  locale: AppLocale
  orgSlug: string
  orgSession: OrgSession
  identity: OrgWorkbenchIdentityRow
}

/**
 * Tier B org-admin chrome — rail pressure, working-memory, and i18n.
 * Parent layout runs Tier A (step-up, session, admin gate, identity) before Suspense.
 */
export async function OrgAdminDeferredWorkbench({
  children,
  locale,
  orgSlug,
  orgSession,
  identity,
}: OrgAdminDeferredWorkbenchProps) {
  const [railPressure, pinnedDtos, viewDtos, recentDtos, t] = await Promise.all([
    getOrgAdminRailPressureCounts(orgSession.organizationId),
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
      t(`rail.inboxLabels.${key}` as Parameters<typeof t>[0], { count }),
  })

  const railSlots = buildOrgAdminRailSlots({
    orgSlug,
    orgName: identity.name ?? identity.slug,
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
    <AppSubLayout
      envelope={envelope}
      rail={{
        slots: {
          ...railSlots,
          footer: (
            <WorkbenchRailFooter
              avatarLabel={identity.name ?? identity.slug}
              primaryLabel={identity.name ?? identity.slug}
              secondaryLabel={identity.slug}
              labels={{
                sidebarControl: t("rail.footer.sidebarMode"),
                expanded: t("rail.footer.expanded"),
                expandedHelp: t("rail.footer.expandedHelp"),
                collapsed: t("rail.footer.collapsed"),
                collapsedHelp: t("rail.footer.collapsedHelp"),
                expandOnHover: t("rail.footer.expandOnHover"),
                expandOnHoverHelp: t("rail.footer.expandOnHoverHelp"),
                current: t("rail.footer.current"),
              }}
            />
          ),
        },
        labels: {
          ariaLabel: t("nav.aria"),
          collapseLabel: t("rail.collapseLabel"),
          expandLabel: t("rail.expandLabel"),
          navSearchPlaceholder: t("rail.navSearchPlaceholder"),
          navSearchAriaLabel: t("rail.navSearchAriaLabel"),
          navSearchCollapsedTriggerAriaLabel: t(
            "rail.navSearchCollapsedTriggerAriaLabel"
          ),
          navSearchNoMatches: t("rail.navSearchNoMatches"),
          inboxAriaLabel: t("rail.inboxAriaLabel"),
          pinnedHeading: t("rail.pinnedHeading"),
          viewsHeading: t("rail.viewsHeading"),
          recentsHeading: t("rail.recentsHeading"),
        },
        storageKey: "afenda.orgAdmin.rail",
      }}
      command={{
        title: t("shell.kicker"),
        description: t("nav.aria"),
        sections: [
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
        ],
      }}
    >
      {children}
    </AppSubLayout>
  )
}
