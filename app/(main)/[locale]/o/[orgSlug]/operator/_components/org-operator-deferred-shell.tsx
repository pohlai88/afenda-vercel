import type { ReactNode } from "react"
import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#app-shell"
import {
  AppShellCommandPalette,
  AppShellPrimaryLeftRailFooter,
} from "#app-shell/client"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import type { GlobalAdminSession, OrgSession } from "#lib/auth"
import {
  buildPlatformAdminRailSlots,
  getPlatformAdminRailPressureCounts,
} from "#features/platform-admin/server"
import { organizationOperatorPath } from "#features/platform-admin"

export type OrgOperatorDeferredShellProps = {
  children: ReactNode
  locale: AppLocale
  orgSlug: string
  globalAdmin: GlobalAdminSession
  orgSession: OrgSession
}

/**
 * Tier B operator chrome — platform-admin translations and rail pressure.
 */
export async function OrgOperatorDeferredShell({
  children,
  locale,
  orgSlug,
  globalAdmin: _globalAdmin,
  orgSession,
}: OrgOperatorDeferredShellProps) {
  const [t, railPressure] = await Promise.all([
    getTranslations("PlatformAdmin"),
    getPlatformAdminRailPressureCounts(),
  ])

  const railSlots = buildPlatformAdminRailSlots({
    pressure: railPressure,
    pathForSegment: (segment) => organizationOperatorPath(orgSlug, segment),
  })

  const envelope: RouteEnvelope = {
    surface: "operator",
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
        },
        storageKey: "afenda.operator.rail",
      }}
      command={
        <AppShellCommandPalette
          dialogTitle={t("title")}
          dialogDescription={t("description")}
          sections={[
            {
              heading: t("nav.aria"),
              items: [
                {
                  id: "operator-overview",
                  label: t("nav.overview"),
                  href: organizationOperatorPath(orgSlug) as Route,
                },
                {
                  id: "operator-users",
                  label: t("nav.users"),
                  href: organizationOperatorPath(orgSlug, "users") as Route,
                },
                {
                  id: "operator-organizations",
                  label: t("nav.organizations"),
                  href: organizationOperatorPath(orgSlug, "organizations") as Route,
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
