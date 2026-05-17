import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#app-shell"
import {
  AppShellCommandPalette,
  AppShellPrimaryLeftRailFooter,
} from "#app-shell/client"
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
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import type { OrgSession } from "#lib/auth"

/** Row from `fetchOrgAdminIdentity` after Tier A `notFound()` guard. */
export type OrgAdminIdentityRow = { name: string | null; slug: string }

export type OrgAdminDeferredShellProps = {
  children: ReactNode
  locale: AppLocale
  orgSlug: string
  orgSession: OrgSession
  identity: OrgAdminIdentityRow
}

/**
 * Tier B org-admin chrome — rail pressure, working-memory, and i18n.
 * Parent layout runs Tier A (step-up, session, admin gate, identity) before Suspense.
 */
export async function OrgAdminDeferredShell({
  children,
  locale,
  orgSlug,
  orgSession,
  identity,
}: OrgAdminDeferredShellProps) {
  const [railPressure, pinnedDtos, viewDtos, recentDtos, t] = await Promise.all(
    [
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
    ]
  )

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
            <AppShellPrimaryLeftRailFooter
              labels={{
                sidebarControl: t("rail.footer.sidebarMode"),
                expanded: t("rail.footer.expanded"),
                expandedHelp: t("rail.footer.expandedHelp"),
                collapsed: t("rail.footer.collapsed"),
                collapsedHelp: t("rail.footer.collapsedHelp"),
                hover: t("rail.footer.expandOnHover"),
                hoverHelp: t("rail.footer.expandOnHoverHelp"),
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
      command={
        <AppShellCommandPalette
          dialogTitle={t("shell.kicker")}
          dialogDescription={t("nav.aria")}
          sections={[
            {
              heading: t("nav.aria"),
              items: [
                {
                  id: "nav-overview",
                  label: t("nav.overview"),
                  href: organizationAdminPath(orgSlug, "overview"),
                },
                {
                  id: "nav-members",
                  label: t("nav.members"),
                  href: organizationAdminPath(orgSlug, "members"),
                },
                {
                  id: "nav-access",
                  label: t("nav.access"),
                  href: organizationAdminPath(orgSlug, "access"),
                },
                {
                  id: "nav-audit",
                  label: t("nav.audit"),
                  href: organizationAdminPath(orgSlug, "audit"),
                },
                {
                  id: "nav-integrations",
                  label: t("nav.integrations"),
                  href: organizationAdminPath(orgSlug, "integrations"),
                },
                {
                  id: "nav-settings",
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
    </AppSubLayout>
  )
}
